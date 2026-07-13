import { z } from "zod";

export const Governorate = {
  NORTH_GAZA: "north_gaza",
  GAZA: "gaza",
  MIDDLE_AREA: "middle_area",
  KHAN_YOUNIS: "khan_younis",
  RAFHA: "rafah",
  UNKNOWN: "unknown",
} as const;

export const HousingStatus = {
  TENT: "tent",
  SHELTER: "shelter",
  DAMAGED_HOME: "damaged_home",
  HOSTED: "hosted",
  RENTED: "rented",
  UNKNOWN: "unknown",
} as const;

export const IncomeStatus = {
  NONE: "none",
  LIMITED: "limited",
  UNSTABLE: "unstable",
  UNKNOWN: "unknown",
} as const;

export const DisplacementStatus = {
  DISPLACED: "displaced",
  NOT_DISPLACED: "not_displaced",
  RETURNED: "returned",
  UNKNOWN: "unknown",
} as const;

export const CaseCategory = {
  MARTYR_FAMILY: "martyr_family",
  WIDOW: "widow",
  ORPHANS: "orphans",
  MODEST_FAMILY: "modest_family",
  NO_BREADWINNER: "no_breadwinner",
  DISPLACED: "displaced",
  MEDICAL: "medical",
  DISABILITY: "disability",
  GENERAL: "general",
} as const;

export const PriorityLevel = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  NORMAL: "normal",
} as const;

export const FamilyProfileStatus = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  PUBLISHED: "published",
  HIDDEN: "hidden",
  ARCHIVED: "archived",
  SUSPENDED: "suspended",
  NEEDS_UPDATE: "needs_update",
} as const;

export const DataSource = {
  FIELD_VISIT: "field_visit",
  PARTNER_NGO: "partner_ngo",
  PHONE_INTAKE: "phone_intake",
  COMMUNITY_REFERRAL: "community_referral",
  SELF_REGISTRATION: "self_registration",
  IMPORTED_BATCH: "imported_batch",
  OTHER: "other",
} as const;

export const ReceivingMethodType = {
  BANK_OF_PALESTINE: "bank_of_palestine",
  USDT: "usdt",
  IBAN: "iban",
  BANK_TRANSFER: "bank_transfer",
  PERSONAL_PICKUP: "personal_pickup",
  DIGITAL_WALLET: "digital_wallet",
  OTHER: "other",
} as const;

export type ReceivingMethodTypeValue =
  (typeof ReceivingMethodType)[keyof typeof ReceivingMethodType];

export interface FamilyReceivingMethod {
  method: ReceivingMethodTypeValue;
  accountNumber?: string;
  accountHolder?: string;
  iban?: string;
  walletAddress?: string;
  usdtNetwork?: string;
  bankName?: string;
  branch?: string;
  swiftBic?: string;
  country?: string;
  receiverName?: string;
  receiverRelationship?: string;
  generalArea?: string;
  methodName?: string;
  methodDescription?: string;
  receivingDetails?: string;
  notes?: string;
  pickupLocation?: string;
  pickupContact?: string;
  walletProvider?: string;
  walletId?: string;
  otherDescription?: string;
}

export interface FamilyMediaItem {
  url: string;
  blurredUrl: string | null;
  mimeType: string;
  filename: string;
  kind: "image" | "video";
  isSensitive: boolean;
}

/** Viewer-scoped media item: `url` is only populated when the viewer is authorized to see it. */
export interface FamilyMediaItemView {
  url: string | null;
  blurredUrl: string | null;
  mimeType: string;
  filename: string;
  kind: "image" | "video";
  isSensitive: boolean;
  locked: boolean;
}

const receivingMethodSchema = z.object({
  method: z.enum([
    "bank_of_palestine",
    "usdt",
    "iban",
    "bank_transfer",
    "personal_pickup",
    "digital_wallet",
    "other",
  ]),
  accountNumber: z.string().optional(),
  accountHolder: z.string().optional(),
  iban: z.string().optional(),
  walletAddress: z.string().optional(),
  usdtNetwork: z.string().optional(),
  bankName: z.string().optional(),
  branch: z.string().optional(),
  swiftBic: z.string().optional(),
  country: z.string().optional(),
  receiverName: z.string().optional(),
  receiverRelationship: z.string().optional(),
  generalArea: z.string().optional(),
  methodName: z.string().optional(),
  methodDescription: z.string().optional(),
  receivingDetails: z.string().optional(),
  notes: z.string().optional(),
  pickupLocation: z.string().optional(),
  pickupContact: z.string().optional(),
  walletProvider: z.string().optional(),
  walletId: z.string().optional(),
  otherDescription: z.string().optional(),
});

const baseFamilyFieldsSchema = z.object({
  accountEmail: z.string().email("Family login email is required"),
  headOfFamilyName: z.string().min(1, "Head of family name is required"),
  headOfFamilyNameAr: z.string().optional(),
  nationalId: z.string().optional(),
  internalPhone: z.string().optional(),
  detailedAddress: z.string().optional(),
  detailedAddressAr: z.string().optional(),
  dataSource: z
    .enum([
      "field_visit",
      "partner_ngo",
      "phone_intake",
      "community_referral",
      "self_registration",
      "imported_batch",
      "other",
    ])
    .optional(),
  internalNotes: z.string().optional(),
  verificationNotes: z.string().optional(),
  assignedCaseOfficer: z.string().optional(),
  governorate: z.enum([
    "north_gaza",
    "gaza",
    "middle_area",
    "khan_younis",
    "rafah",
    "unknown",
  ]),
  areaGeneral: z.string().optional(),
  areaGeneralAr: z.string().optional(),
  publicStory: z.string().optional(),
  publicStoryAr: z.string().optional(),
  familySize: z.coerce.number().int().min(1, "Family size is required"),
  childrenCount: z.coerce.number().int().min(0).default(0),
  infantCount: z.coerce.number().int().min(0).default(0),
  womenCount: z.coerce.number().int().min(0).default(0),
  elderlyCount: z.coerce.number().int().min(0).default(0),
  hasWidow: z.coerce.boolean().default(false),
  hasOrphans: z.coerce.boolean().default(false),
  hasDisabledMember: z.coerce.boolean().default(false),
  hasChronicPatient: z.coerce.boolean().default(false),
  housingStatus: z
    .enum([
      "tent",
      "shelter",
      "damaged_home",
      "hosted",
      "rented",
      "unknown",
    ])
    .optional()
    .default("unknown"),
  incomeStatus: z
    .enum(["none", "limited", "unstable", "unknown"])
    .optional()
    .default("unknown"),
  displacementStatus: z
    .enum(["displaced", "not_displaced", "returned", "unknown"])
    .optional()
    .default("unknown"),
  caseCategory: z.enum([
    "martyr_family",
    "widow",
    "orphans",
    "modest_family",
    "no_breadwinner",
    "displaced",
    "medical",
    "disability",
    "general",
  ]),
  priorityLevel: z.enum(["critical", "high", "medium", "normal"]),
  monthlyRequiredAmount: z.coerce
    .number()
    .min(0, "Monthly required amount is required"),
  receivingMethods: z.array(receivingMethodSchema).default([]),
  externalLinks: z.string().optional(),
  profileStatus: z
    .enum([
      "draft",
      "pending_review",
      "published",
      "hidden",
      "archived",
      "suspended",
      "needs_update",
    ])
    .optional()
    .default("published"),
  isPilotFamily: z.coerce.boolean().default(true),
  pilotBatchNumber: z.coerce.number().int().min(1).default(1),
  pilotNotes: z.string().optional(),
  /** Per-uploaded-media-file sensitivity flag, matched by upload order to the `media` files. */
  mediaSensitivity: z.array(z.coerce.boolean()).optional(),
});

function applyFamilyFieldRefinements<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const minMembers = data.childrenCount + data.infantCount;
    if (data.familySize < minMembers) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Family size cannot be less than the total of children and infants",
        path: ["familySize"],
      });
    }
    const demographicTotal =
      data.childrenCount +
      data.infantCount +
      data.womenCount +
      data.elderlyCount;
    if (demographicTotal > data.familySize) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Family size cannot be less than the sum of children, infants, women, and elderly counts",
        path: ["familySize"],
      });
    }
    for (const [index, method] of data.receivingMethods.entries()) {
      const requireField = (field: keyof typeof method, label: string) => {
        if (!method[field]?.toString().trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${label} is required for the selected payment method`,
            path: ["receivingMethods", index, field],
          });
        }
      };
      switch (method.method) {
        case "bank_of_palestine":
          requireField("accountHolder", "Account holder name");
          requireField("accountNumber", "Account number");
          requireField("branch", "Branch");
          break;
        case "usdt":
          requireField("usdtNetwork", "USDT network");
          requireField("walletAddress", "Wallet address");
          break;
        case "iban":
          requireField("bankName", "Bank name");
          requireField("accountHolder", "Account holder name");
          requireField("iban", "IBAN");
          requireField("swiftBic", "SWIFT/BIC");
          requireField("country", "Country");
          break;
        case "bank_transfer":
          requireField("bankName", "Bank name");
          requireField("accountNumber", "Account number");
          requireField("accountHolder", "Account holder name");
          break;
        case "personal_pickup":
          requireField("receiverName", "Receiver name");
          requireField("receiverRelationship", "Receiver relationship to family");
          requireField("generalArea", "General area");
          break;
        case "digital_wallet":
          requireField("walletProvider", "Wallet provider");
          requireField("walletId", "Wallet ID");
          break;
        case "other":
          requireField("methodName", "Method name");
          requireField("methodDescription", "Method description");
          requireField("receivingDetails", "Receiving details");
          break;
      }
    }
  });
}

export const familyFieldsSchema = baseFamilyFieldsSchema;

export const createFamilySchema = applyFamilyFieldRefinements(
  baseFamilyFieldsSchema.extend({
    accountPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmAccountPassword: z.string(),
  }),
).refine((data) => data.accountPassword === data.confirmAccountPassword, {
    message: "Passwords do not match",
    path: ["confirmAccountPassword"],
  });

export type CreateFamilyInput = z.infer<typeof createFamilySchema>;

export const updateFamilySchema = applyFamilyFieldRefinements(
  baseFamilyFieldsSchema.extend({
    accountPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .optional(),
    confirmAccountPassword: z.string().optional(),
  }),
).refine(
    (data: {
      accountPassword?: string;
      confirmAccountPassword?: string;
    }) => {
      if (!data.accountPassword && !data.confirmAccountPassword) return true;
      return data.accountPassword === data.confirmAccountPassword;
    },
    { message: "Passwords do not match", path: ["confirmAccountPassword"] },
  );

export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>;

export const restrictFamilySchema = z.object({
  restricted: z.boolean(),
});

export type RestrictFamilyInput = z.infer<typeof restrictFamilySchema>;

export const hideFamilySchema = z.object({
  hidden: z.boolean(),
});

export type HideFamilyInput = z.infer<typeof hideFamilySchema>;

export const updateFamilyMediaVisibilitySchema = z.object({
  items: z.array(
    z.object({
      url: z.string(),
      isSensitive: z.boolean(),
    }),
  ),
});

export type UpdateFamilyMediaVisibilityInput = z.infer<
  typeof updateFamilyMediaVisibilitySchema
>;

export interface FamilyListItem {
  id: string;
  publicCode: string;
  governorate: string;
  familySize: number;
  childrenCount: number;
  caseCategory: string;
  priorityLevel: string;
  monthlyRequiredAmount: number;
  monthlyCoveredAmount: number;
  monthlyRemainingAmount: number;
  profileStatus: string;
  coverageStatus: string;
  headOfFamilyName: string | null;
  headOfFamilyNameAr: string | null;
  accountEmail: string | null;
  accountRestricted: boolean;
  updatedAt: string;
}

export interface FamilyDetail extends FamilyListItem {
  nationalId: string | null;
  internalPhone: string | null;
  detailedAddress: string | null;
  detailedAddressAr: string | null;
  dataSource: string | null;
  internalNotes: string | null;
  verificationNotes: string | null;
  assignedCaseOfficer: string | null;
  areaGeneral: string | null;
  areaGeneralAr: string | null;
  publicStory: string | null;
  publicStoryAr: string | null;
  headOfFamilyNameAr: string | null;
  womenCount: number;
  elderlyCount: number;
  infantCount: number;
  hasWidow: boolean;
  hasOrphans: boolean;
  hasDisabledMember: boolean;
  hasChronicPatient: boolean;
  housingStatus: string;
  incomeStatus: string;
  displacementStatus: string;
  isPilotFamily: boolean;
  pilotBatchNumber: number;
  pilotNotes: string | null;
  familyLoginEnabled: boolean;
  accountStatus: string | null;
  receivingMethods: FamilyReceivingMethod[];
  mediaItems: FamilyMediaItem[];
  externalLinks: string | null;
  createdAt: string;
}

/** Donor-visible family profile (published families only). */
export interface FamilyPublicProfile {
  publicCode: string;
  governorate: string;
  areaGeneral: string | null;
  areaGeneralAr: string | null;
  familySize: number;
  childrenCount: number;
  womenCount: number;
  elderlyCount: number;
  infantCount: number;
  hasWidow: boolean;
  hasOrphans: boolean;
  hasDisabledMember: boolean;
  hasChronicPatient: boolean;
  housingStatus: string;
  incomeStatus: string;
  displacementStatus: string;
  caseCategory: string;
  priorityLevel: string;
  monthlyRequiredAmount: number;
  monthlyCoveredAmount: number;
  monthlyRemainingAmount: number;
  coverageStatus: string;
  /** True when the authenticated donor has an active sponsorship for this family. */
  donorHasActiveSponsorship?: boolean;
  /** @deprecated Use donorHasActiveSponsorship */
  donorHasApprovedSponsorship?: boolean;
  receivingMethods: FamilyReceivingMethod[];
  receivingMethodTypes?: string[];
  publicStory: string | null;
  publicStoryAr: string | null;
  mediaItems: FamilyMediaItemView[];
  externalLinks: string | null;
  updatedAt: string;
}

export interface FamilyDashboardOverview {
  publicCode: string;
  monthlyRequiredAmount: number;
  monthlyCoveredAmount: number;
  monthlyRemainingAmount: number;
  totalDonors: number;
  coverageStatus: string;
}

export interface FamilyFundingAmounts {
  monthlyRequiredAmount: number;
  monthlyCoveredAmount: number;
  monthlyRemainingAmount: number;
}
