import { LEGAL_DOCUMENT_TYPES } from "./legal-document-types.js";
import type { LegalDocumentType } from "./legal-document-types.js";

export const DEFAULT_REQUIRED_LEGAL_DOCUMENT_TYPES: LegalDocumentType[] = [
  "privacy_policy",
  "personal_data_consent"
];

const KNOWN_LEGAL_DOCUMENT_TYPES = new Set<LegalDocumentType>(LEGAL_DOCUMENT_TYPES);

export function resolveRequiredLegalDocumentTypes(
  rawValue: string | undefined
): LegalDocumentType[] {
  if (!rawValue || rawValue.trim().length === 0) {
    return DEFAULT_REQUIRED_LEGAL_DOCUMENT_TYPES;
  }

  const parsed = rawValue
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is LegalDocumentType => KNOWN_LEGAL_DOCUMENT_TYPES.has(item as never));

  if (parsed.length === 0) {
    return DEFAULT_REQUIRED_LEGAL_DOCUMENT_TYPES;
  }

  return [...new Set(parsed)];
}
