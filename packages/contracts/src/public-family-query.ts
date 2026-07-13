import { z } from "zod";

export const PublicFamilySizeRange = {
  SIZE_1_3: "1_3",
  SIZE_4_6: "4_6",
  SIZE_7_9: "7_9",
  SIZE_10_PLUS: "10_plus",
} as const;

export const PublicChildrenCountRange = {
  NONE: "none",
  COUNT_1_2: "1_2",
  COUNT_3_5: "3_5",
  COUNT_6_PLUS: "6_plus",
} as const;

export const PublicMonthlyAmountRange = {
  UP_TO_50: "up_to_50",
  RANGE_51_100: "51_100",
  RANGE_101_200: "101_200",
  OVER_200: "over_200",
} as const;

export const PublicCoveragePercentRange = {
  ZERO: "0",
  UNDER_25: "under_25",
  RANGE_25_50: "25_50",
  RANGE_50_75: "50_75",
  OVER_75: "over_75",
} as const;

export const PublicSponsorshipCoverageFilter = {
  NOT_SPONSORED: "not_sponsored",
  PARTIALLY_SPONSORED: "partially_sponsored",
  FULLY_COVERED_TEMPORARILY: "fully_covered_temporarily",
  NEEDS_ADDITIONAL_SPONSOR: "needs_additional_sponsor",
  ENDING_SOON: "ending_soon",
} as const;

export const PublicMediaAvailabilityFilter = {
  HAS_IMAGES: "has_images",
  HAS_VIDEO: "has_video",
  HAS_RECENT_UPDATES: "has_recent_updates",
} as const;

export const publicFamilyQuerySchema = z.object({
  search: z.string().optional(),
  governorate: z
    .enum([
      "north_gaza",
      "gaza",
      "middle_area",
      "khan_younis",
      "rafah",
      "unknown",
    ])
    .optional(),
  familySizeRange: z
    .enum(["1_3", "4_6", "7_9", "10_plus"])
    .optional(),
  childrenCountRange: z
    .enum(["none", "1_2", "3_5", "6_plus"])
    .optional(),
  caseCategory: z
    .enum([
      "martyr_family",
      "widow",
      "orphans",
      "modest_family",
      "no_breadwinner",
      "displaced",
      "medical",
      "disability",
      "general",
    ])
    .optional(),
  priorityLevel: z.enum(["critical", "high", "medium", "normal"]).optional(),
  sponsorshipCoverage: z
    .enum([
      "not_sponsored",
      "partially_sponsored",
      "fully_covered_temporarily",
      "needs_additional_sponsor",
      "ending_soon",
    ])
    .optional(),
  receivingMethod: z
    .enum([
      "bank_of_palestine",
      "usdt",
      "iban",
      "bank_transfer",
      "personal_pickup",
      "digital_wallet",
      "other",
    ])
    .optional(),
  monthlyAmountRange: z
    .enum(["up_to_50", "51_100", "101_200", "over_200"])
    .optional(),
  coveragePercentRange: z
    .enum(["0", "under_25", "25_50", "50_75", "over_75"])
    .optional(),
  mediaAvailability: z
    .enum(["has_images", "has_video", "has_recent_updates"])
    .optional(),
});

export type PublicFamilyQuery = z.infer<typeof publicFamilyQuerySchema>;
