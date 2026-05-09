import { BadRequestException } from "@nestjs/common";
import assert from "node:assert/strict";
import { test } from "node:test";

import { LegalService } from "../src/legal/legal.service.js";

type ActiveDocument = {
  contentMd: string;
  id: string;
  publishedAt: Date | null;
  title: string;
  type: "privacy_policy" | "personal_data_consent" | "user_agreement" | "club_rules";
  version: string;
};

test("getActiveDocuments returns active legal document payload", async () => {
  const repository = createInMemoryLegalRepository();
  const service = new LegalService(createConfigService() as never, repository as never);

  const result = await service.getActiveDocuments();

  assert.equal(result.data.length, 2);
  assert.equal(result.data[0]?.type, "personal_data_consent");
  assert.equal(result.data[1]?.type, "privacy_policy");
});

test("acceptConsents stores consent records and returns consentRequired=false after required docs", async () => {
  const repository = createInMemoryLegalRepository();
  const service = new LegalService(createConfigService() as never, repository as never);

  const result = await service.acceptConsents(
    "user-1",
    {
      documents: [
        { type: "privacy_policy", version: "1.0.0" },
        { type: "personal_data_consent", version: "1.0.0" }
      ]
    },
    {
      ipAddress: "203.0.113.10",
      userAgent: "test-agent"
    }
  );

  assert.equal(result.data.accepted, true);
  assert.equal(result.data.consentRequired, false);
});

test("acceptConsents rejects inactive or mismatched document versions", async () => {
  const repository = createInMemoryLegalRepository();
  const service = new LegalService(createConfigService() as never, repository as never);

  await assert.rejects(
    () =>
      service.acceptConsents(
        "user-1",
        {
          documents: [{ type: "privacy_policy", version: "9.9.9" }]
        },
        {
          ipAddress: null,
          userAgent: null
        }
      ),
    BadRequestException
  );
});

test("acceptConsents de-duplicates repeated document entries", async () => {
  const repository = createInMemoryLegalRepository();
  const service = new LegalService(createConfigService() as never, repository as never);

  const result = await service.acceptConsents(
    "user-1",
    {
      documents: [
        { type: "privacy_policy", version: "1.0.0" },
        { type: "privacy_policy", version: "1.0.0" },
        { type: "personal_data_consent", version: "1.0.0" }
      ]
    },
    {
      ipAddress: null,
      userAgent: null
    }
  );

  assert.equal(result.data.accepted, true);
  assert.equal(result.data.consentRequired, false);
  assert.equal(repository.getConsentCount(), 2);
});

function createConfigService() {
  return {
    get(key: string): string | undefined {
      if (key === "LEGAL_REQUIRED_DOCUMENT_TYPES") {
        return "privacy_policy,personal_data_consent";
      }

      return undefined;
    }
  };
}

function createInMemoryLegalRepository() {
  const activeDocuments: ActiveDocument[] = [
    {
      contentMd: "Consent text",
      id: "doc-consent",
      publishedAt: new Date("2026-01-10T00:00:00.000Z"),
      title: "Personal Data Consent",
      type: "personal_data_consent",
      version: "1.0.0"
    },
    {
      contentMd: "Policy text",
      id: "doc-policy",
      publishedAt: new Date("2026-01-10T00:00:00.000Z"),
      title: "Privacy Policy",
      type: "privacy_policy",
      version: "1.0.0"
    }
  ];

  const accepted = new Set<string>();

  return {
    getConsentCount() {
      return accepted.size;
    },

    async listActiveDocuments(): Promise<ActiveDocument[]> {
      return [...activeDocuments].sort((left, right) => left.type.localeCompare(right.type));
    },

    async findActiveDocumentsByTypeVersion(
      pairs: Array<{ type: ActiveDocument["type"]; version: string }>
    ): Promise<ActiveDocument[]> {
      return activeDocuments.filter((document) =>
        pairs.some((pair) => pair.type === document.type && pair.version === document.version)
      );
    },

    async createConsentRecords(
      records: Array<{
        legalDocumentId: string;
        userId: string;
      }>
    ): Promise<void> {
      for (const record of records) {
        accepted.add(`${record.userId}:${record.legalDocumentId}`);
      }
    },

    async hasAcceptedRequiredConsents(
      userId: string,
      requiredTypes: ActiveDocument["type"][]
    ): Promise<boolean> {
      return requiredTypes.every((requiredType) => {
        const activeDocument = activeDocuments.find((document) => document.type === requiredType);
        if (!activeDocument) {
          return false;
        }

        return accepted.has(`${userId}:${activeDocument.id}`);
      });
    }
  };
}
