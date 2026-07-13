import { z } from "zod";

export const LegalDocumentSlug = {
  TERMS_OF_USE: "terms_of_use",
  PRIVACY_POLICY: "privacy_policy",
  DIRECT_SPONSORSHIP_POLICY: "direct_sponsorship_policy",
  COMMUNICATION_POLICY: "communication_policy",
} as const;

export type LegalDocumentSlugValue =
  (typeof LegalDocumentSlug)[keyof typeof LegalDocumentSlug];

export const legalDocumentSlugs = [
  LegalDocumentSlug.TERMS_OF_USE,
  LegalDocumentSlug.PRIVACY_POLICY,
  LegalDocumentSlug.DIRECT_SPONSORSHIP_POLICY,
  LegalDocumentSlug.COMMUNICATION_POLICY,
] as const;

export const updateLegalDocumentSchema = z.object({
  contentEn: z.string(),
  contentAr: z.string(),
});

export type UpdateLegalDocumentInput = z.infer<typeof updateLegalDocumentSchema>;

export interface LegalDocumentPublic {
  slug: LegalDocumentSlugValue;
  contentEn: string;
  contentAr: string;
  updatedAt: string;
}
