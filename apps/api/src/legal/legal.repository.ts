import { Injectable } from "@nestjs/common";

import { databaseClient } from "../database.js";
import type { LegalDocumentType } from "./legal-document-types.js";

export type ActiveLegalDocumentRecord = {
  contentMd: string;
  id: string;
  publishedAt: Date | null;
  title: string;
  type: LegalDocumentType;
  version: string;
};

type ConsentRecordInput = {
  acceptedAt: Date;
  documentType: LegalDocumentType;
  documentVersion: string;
  ipAddress: string | null;
  legalDocumentId: string;
  userAgent: string | null;
  userId: string;
};

@Injectable()
export class LegalRepository {
  async listActiveDocuments(): Promise<ActiveLegalDocumentRecord[]> {
    return await databaseClient.legalDocument.findMany({
      where: {
        isActive: true
      },
      select: {
        contentMd: true,
        id: true,
        publishedAt: true,
        title: true,
        type: true,
        version: true
      },
      orderBy: [{ type: "asc" }, { publishedAt: "desc" }]
    });
  }

  async findActiveDocumentsByTypeVersion(
    pairs: Array<{ type: LegalDocumentType; version: string }>
  ): Promise<ActiveLegalDocumentRecord[]> {
    if (pairs.length === 0) {
      return [];
    }

    return await databaseClient.legalDocument.findMany({
      where: {
        OR: pairs.map((pair) => ({
          isActive: true,
          type: pair.type,
          version: pair.version
        }))
      },
      select: {
        contentMd: true,
        id: true,
        publishedAt: true,
        title: true,
        type: true,
        version: true
      }
    });
  }

  async createConsentRecords(records: ConsentRecordInput[]): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await databaseClient.consent.createMany({
      data: records.map((record) => ({
        acceptedAt: record.acceptedAt,
        documentType: record.documentType,
        documentVersion: record.documentVersion,
        ipAddress: record.ipAddress,
        legalDocumentId: record.legalDocumentId,
        userAgent: record.userAgent,
        userId: record.userId
      })),
      skipDuplicates: true
    });
  }

  async hasAcceptedRequiredConsents(
    userId: string,
    requiredTypes: LegalDocumentType[]
  ): Promise<boolean> {
    if (requiredTypes.length === 0) {
      return true;
    }

    const activeRequiredDocuments: Array<{ id: string; type: LegalDocumentType }> =
      await databaseClient.legalDocument.findMany({
      where: {
        isActive: true,
        type: {
          in: requiredTypes
        }
      },
      select: {
        id: true,
        type: true
      }
    });
    const activeTypeSet = new Set(
      activeRequiredDocuments.map((document: { id: string; type: LegalDocumentType }) => document.type)
    );
    if (activeTypeSet.size !== requiredTypes.length) {
      return false;
    }

    const acceptedConsents: Array<{ documentType: LegalDocumentType }> =
      await databaseClient.consent.findMany({
      where: {
        legalDocumentId: {
          in: activeRequiredDocuments.map(
            (document: { id: string; type: LegalDocumentType }) => document.id
          )
        },
        userId
      },
      select: {
        documentType: true
      }
    });
    const acceptedTypes = new Set(
      acceptedConsents.map((consent: { documentType: LegalDocumentType }) => consent.documentType)
    );

    return requiredTypes.every((requiredType) => acceptedTypes.has(requiredType));
  }
}
