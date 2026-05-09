import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  AcceptLegalConsentsRequestDto,
  ConsentDocumentInputDto
} from "./dto/legal.dto.js";
import { LegalRepository } from "./legal.repository.js";
import { resolveRequiredLegalDocumentTypes } from "./legal-consent-policy.js";

type ActiveLegalDocumentsResponse = {
  data: Array<{
    contentMd: string;
    publishedAt: string | null;
    title: string;
    type: string;
    version: string;
  }>;
};

type AcceptConsentsResponse = {
  data: {
    accepted: boolean;
    consentRequired: boolean;
  };
};

type ConsentRequestContext = {
  ipAddress: string | null;
  userAgent: string | null;
};

@Injectable()
export class LegalService {
  constructor(
    private readonly configService: ConfigService,
    private readonly legalRepository: LegalRepository
  ) {}

  async getActiveDocuments(): Promise<ActiveLegalDocumentsResponse> {
    const documents = await this.legalRepository.listActiveDocuments();

    return {
      data: documents.map((document) => ({
        contentMd: document.contentMd,
        publishedAt: document.publishedAt ? document.publishedAt.toISOString() : null,
        title: document.title,
        type: document.type,
        version: document.version
      }))
    };
  }

  async acceptConsents(
    userId: string,
    payload: AcceptLegalConsentsRequestDto,
    context: ConsentRequestContext
  ): Promise<AcceptConsentsResponse> {
    const uniqueDocuments = deduplicateDocuments(payload.documents);
    const activeDocuments = await this.legalRepository.findActiveDocumentsByTypeVersion(uniqueDocuments);
    if (activeDocuments.length !== uniqueDocuments.length) {
      throw new BadRequestException(
        "One or more legal documents are not active or have an invalid version"
      );
    }

    const now = new Date();
    await this.legalRepository.createConsentRecords(
      activeDocuments.map((document) => ({
        acceptedAt: now,
        documentType: document.type,
        documentVersion: document.version,
        ipAddress: context.ipAddress,
        legalDocumentId: document.id,
        userAgent: context.userAgent,
        userId
      }))
    );

    const requiredTypes = resolveRequiredLegalDocumentTypes(
      this.configService.get<string>("LEGAL_REQUIRED_DOCUMENT_TYPES")
    );
    const hasRequiredConsents = await this.legalRepository.hasAcceptedRequiredConsents(
      userId,
      requiredTypes
    );

    return {
      data: {
        accepted: true,
        consentRequired: !hasRequiredConsents
      }
    };
  }

  async hasAcceptedRequiredConsents(userId: string): Promise<boolean> {
    const requiredTypes = resolveRequiredLegalDocumentTypes(
      this.configService.get<string>("LEGAL_REQUIRED_DOCUMENT_TYPES")
    );

    return await this.legalRepository.hasAcceptedRequiredConsents(userId, requiredTypes);
  }
}

function deduplicateDocuments(
  documents: ConsentDocumentInputDto[]
): Array<{ type: ConsentDocumentInputDto["type"]; version: string }> {
  const unique = new Map<string, { type: ConsentDocumentInputDto["type"]; version: string }>();

  for (const document of documents) {
    const key = `${document.type}:${document.version}`;
    if (!unique.has(key)) {
      unique.set(key, {
        type: document.type,
        version: document.version
      });
    }
  }

  return [...unique.values()];
}
