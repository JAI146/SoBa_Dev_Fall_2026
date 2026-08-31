import { z } from "zod";
import { checklistCategoryValues, pathwayApplicationStatusValues, pathwayVerificationMethodValues } from "./enums";

export const amountBreakdownSchema = z.object({ label: z.string(), amount: z.number() });
export const pathwayPublicSchema = z.object({
  key: z.string(), title: z.string(), description: z.string(), minimumAmount: z.number(),
  iconEmoji: z.string(), whyThisAmountBody: z.string(), whyThisAmountBreakdown: z.array(amountBreakdownSchema),
  sourceLabel: z.string(), sourceUrl: z.string().url(), sortOrder: z.number().int(),
});
export type PathwayPublic = z.infer<typeof pathwayPublicSchema>;

export const partnerPublicSchema = z.object({
  id: z.string().uuid(), name: z.string(), partnerType: z.string(), description: z.string(),
  locationLabel: z.string(), capabilityTags: z.array(z.string()), pathwayKey: z.string(), sortOrder: z.number().int(),
});
export type PartnerPublic = z.infer<typeof partnerPublicSchema>;

export const checklistItemPublicSchema = z.object({
  id: z.string().uuid(), category: z.enum(checklistCategoryValues), title: z.string(), description: z.string(),
  isComplete: z.boolean(), completedAt: z.string().datetime().nullable(), sortOrder: z.number().int(),
});
export type ChecklistItemPublic = z.infer<typeof checklistItemPublicSchema>;

export const pathwayApplicationPublicSchema = z.object({
  id: z.string().uuid(), pathway: pathwayPublicSchema, attestedAmount: z.number().nullable(),
  attestationAcceptedAt: z.string().datetime().nullable(), verificationMethod: z.enum(pathwayVerificationMethodValues),
  status: z.enum(pathwayApplicationStatusValues), submittedAt: z.string().datetime().nullable(),
  partners: z.array(partnerPublicSchema), checklistItems: z.array(checklistItemPublicSchema),
  createdAt: z.string().datetime(), updatedAt: z.string().datetime(),
});
export type PathwayApplicationPublic = z.infer<typeof pathwayApplicationPublicSchema>;

export const pathwaysListResponseSchema = z.object({ pathways: z.array(pathwayPublicSchema) });
export const partnersListResponseSchema = z.object({ partners: z.array(partnerPublicSchema) });
export const createPathwayApplicationSchema = z.object({ pathwayKey: z.string().trim().min(1).max(100) });
export const verifyPathwayApplicationSchema = z.object({
  attestedAmount: z.number().min(0.01, "Enter an amount of at least $0.01.").multipleOf(0.01, "Use no more than two decimal places.").max(9_999_999.99, "Savings must be below $10,000,000."),
  attestationAccepted: z.boolean(),
});
export const selectPathwayPartnersSchema = z.object({ partnerIds: z.array(z.string().uuid()).min(1, "Select at least one partner to continue.") });
export const updateChecklistItemSchema = z.object({ isComplete: z.boolean() });
export type PathwaysListResponse = z.infer<typeof pathwaysListResponseSchema>;
export type PartnersListResponse = z.infer<typeof partnersListResponseSchema>;
export type CreatePathwayApplicationInput = z.infer<typeof createPathwayApplicationSchema>;
export type VerifyPathwayApplicationInput = z.infer<typeof verifyPathwayApplicationSchema>;
export type SelectPathwayPartnersInput = z.infer<typeof selectPathwayPartnersSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
