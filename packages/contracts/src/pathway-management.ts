import { z } from "zod";
import { adminPathwayApplicationListItemSchema } from "./admin";
import { tierValues } from "./enums";
import { isSingleBadgeEmoji } from "./badges";

const money = z
  .number()
  .finite()
  .min(0)
  .max(99999999.99)
  .refine(
    (value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.000001,
    "Use at most two decimal places.",
  );
export const pathwayCatalogInputSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    description: z.string().trim().min(1).max(500),
    minimumAmount: money,
    iconEmoji: z.string().refine(isSingleBadgeEmoji, "Choose one emoji."),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
    whyThisAmountBody: z.string().trim().min(1).max(10000),
    whyThisAmountBreakdown: z
      .array(
        z
          .object({ label: z.string().trim().min(1).max(150), amount: money })
          .strict(),
      )
      .max(20),
    sourceLabel: z.string().trim().min(1).max(150),
    sourceUrl: z
      .string()
      .url()
      .max(500)
      .refine(
        (value) => /^https?:\/\//i.test(value),
        "Use an HTTP or HTTPS URL.",
      ),
  })
  .strict();
export const pathwayCatalogUpdateSchema = pathwayCatalogInputSchema.extend({
  version: z.number().int().positive(),
});
export const pathwayCatalogSchema = pathwayCatalogUpdateSchema.extend({
  key: z.string(),
  applicationCount: z.number().int().min(0),
  checklistTemplateCount: z.number().int().min(0),
});
export const partnerCatalogInputSchema = z
  .object({
    name: z.string().trim().min(1).max(180),
    partnerType: z.string().trim().min(1).max(100),
    description: z.string().trim().min(1).max(500),
    locationLabel: z.string().trim().min(1).max(150),
    capabilityTags: z
      .array(z.string().trim().min(1).max(100))
      .max(20)
      .refine(
        (tags) => new Set(tags).size === tags.length,
        "Remove duplicate tags.",
      ),
    pathwayKey: z.string().trim().min(1).max(100),
    isActive: z.boolean(),
    sortOrder: z.number().int().min(0).max(10000),
  })
  .strict();
export const partnerCatalogUpdateSchema = partnerCatalogInputSchema.extend({
  version: z.number().int().positive(),
});
export const partnerCatalogSchema = partnerCatalogUpdateSchema.extend({
  id: z.string().uuid(),
  applicationCount: z.number().int().min(0),
});
export const managedApplicationSchema =
  adminPathwayApplicationListItemSchema.extend({
    tier: z.enum(tierValues),
    membershipEligible: z.boolean(),
    savingsEligible: z.boolean(),
    attestationAccepted: z.boolean(),
    checklistReady: z.boolean(),
    checklistReadyAt: z.string().datetime().nullable(),
  });
export const pathwayManagementResponseSchema = z.object({
  pathways: z.array(pathwayCatalogSchema),
  partners: z.array(partnerCatalogSchema),
  applications: z.array(managedApplicationSchema),
  canManage: z.boolean(),
});
export type PathwayCatalog = z.infer<typeof pathwayCatalogSchema>;
export type PathwayCatalogUpdate = z.infer<typeof pathwayCatalogUpdateSchema>;
export type PartnerCatalog = z.infer<typeof partnerCatalogSchema>;
export type PartnerCatalogInput = z.infer<typeof partnerCatalogInputSchema>;
export type PartnerCatalogUpdate = z.infer<typeof partnerCatalogUpdateSchema>;
export type ManagedApplication = z.infer<typeof managedApplicationSchema>;
