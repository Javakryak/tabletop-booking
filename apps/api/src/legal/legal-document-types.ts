export const LEGAL_DOCUMENT_TYPES = [
  "privacy_policy",
  "user_agreement",
  "personal_data_consent",
  "club_rules"
] as const;

export type LegalDocumentType = (typeof LEGAL_DOCUMENT_TYPES)[number];
