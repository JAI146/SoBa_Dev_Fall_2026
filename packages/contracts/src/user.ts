import { z } from "zod";
import type {
  AdminRoleValue,
  OnboardingStatusValue,
  TierValue,
  UserStatusValue,
  UserTypeValue,
} from "./enums";

/**
 * Notification preferences. This is only the shell that lives on the user
 * record — nothing dispatches notifications yet.
 */
export const notificationPreferencesSchema = z.object({
  productUpdates: z.boolean(),
  goalReminders: z.boolean(),
  weeklyCheckIn: z.boolean(),
  securityAlerts: z.boolean(),
});

export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  productUpdates: true,
  goalReminders: true,
  weeklyCheckIn: true,
  securityAlerts: true,
};

export const updateNotificationPreferencesSchema = notificationPreferencesSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Pick at least one preference to update.",
  });

export type UpdateNotificationPreferencesInput = z.infer<
  typeof updateNotificationPreferencesSchema
>;

/** Legal documents a person agrees to. Versioned so re-consent is possible later. */
export const PolicyDocumentKey = {
  TERMS_OF_USE: "terms_of_use",
  PRIVACY_POLICY: "privacy_policy",
} as const;

export const policyDocumentKeyValues = [
  PolicyDocumentKey.TERMS_OF_USE,
  PolicyDocumentKey.PRIVACY_POLICY,
] as const;

export type PolicyDocumentKeyValue =
  (typeof PolicyDocumentKey)[keyof typeof PolicyDocumentKey];

export interface PolicyAgreementRecord {
  version: string;
  /** ISO-8601 timestamp, always stamped server-side. */
  agreedAt: string;
}

export type PolicyAgreements = Partial<
  Record<PolicyDocumentKeyValue, PolicyAgreementRecord>
>;

export const recordPolicyAgreementSchema = z.object({
  documentKey: z.enum(policyDocumentKeyValues),
  version: z
    .string()
    .trim()
    .min(1, "Let us know which version of the document you agreed to.")
    .max(50),
});

export type RecordPolicyAgreementInput = z.infer<
  typeof recordPolicyAgreementSchema
>;

/** The only user shape that ever leaves the API. No hashes, no tokens. */
export interface UserPublic {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  userType: UserTypeValue;
  adminRole: AdminRoleValue | null;
  status: UserStatusValue;
  displayName: string | null;
  onboardingStatus: OnboardingStatusValue;
  onboardingCompletedAt: string | null;
  tier: TierValue;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  deleteAccountRequestedAt: string | null;
  notificationPreferences: NotificationPreferences;
  policyAgreements: PolicyAgreements;
  createdAt: string;
}

const optionalPlace = z
  .string()
  .trim()
  .max(100)
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const updateProfileSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "We'd love a first name to greet you by.")
      .max(100)
      .optional(),
    lastName: z
      .string()
      .trim()
      .min(1, "We'd love a last name to go with your first.")
      .max(100)
      .optional(),
    displayName: z
      .string()
      .trim()
      .min(1, "We'd love a name to greet you by.")
      .max(100)
      .optional(),
    country: optionalPlace,
    state: optionalPlace,
    city: optionalPlace,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Pick at least one detail to update.",
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const profileImageUploadSchema = z.object({
  contentType: z
    .string()
    .regex(
      /^image\/(jpeg|png|webp|heic)$/,
      "Profile pictures work best as a JPEG, PNG, WebP or HEIC image.",
    ),
  /** Bytes. Checked here so we never hand out a URL for something oversized. */
  contentLength: z
    .number()
    .int()
    .positive()
    .max(5 * 1024 * 1024, "Profile pictures need to be under 5 MB."),
});

export type ProfileImageUploadInput = z.infer<typeof profileImageUploadSchema>;

export interface ProfileImageUploadResponse {
  /** PUT the image bytes here with the same Content-Type. */
  uploadUrl: string;
  /** Where the image will live once the upload finishes. */
  publicUrl: string;
  expiresInSeconds: number;
}

export interface DeletionRequestResponse {
  deleteAccountRequestedAt: string | null;
  message: string;
}
