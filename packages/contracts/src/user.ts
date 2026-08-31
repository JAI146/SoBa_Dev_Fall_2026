import { z } from "zod";
import {
  adminRoleValues,
  onboardingStatusValues,
  tierValues,
  userStatusValues,
  userTypeValues,
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

export const policyAgreementRecordSchema = z.object({
  version: z.string(),
  /** ISO-8601 timestamp, always stamped server-side. */
  agreedAt: z.string().datetime(),
});

export type PolicyAgreementRecord = z.infer<
  typeof policyAgreementRecordSchema
>;

export const policyAgreementsSchema = z
  .object({
    [PolicyDocumentKey.TERMS_OF_USE]: policyAgreementRecordSchema,
    [PolicyDocumentKey.PRIVACY_POLICY]: policyAgreementRecordSchema,
  })
  .partial();

export type PolicyAgreements = z.infer<typeof policyAgreementsSchema>;

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
export const userPublicSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  profileImageUrl: z.string().nullable(),
  country: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  timeZone: z.string().nullable(),
  userType: z.enum(userTypeValues),
  adminRole: z.enum(adminRoleValues).nullable(),
  status: z.enum(userStatusValues),
  displayName: z.string().nullable(),
  onboardingStatus: z.enum(onboardingStatusValues),
  onboardingCompletedAt: z.string().datetime().nullable(),
  tier: z.enum(tierValues),
  emailVerifiedAt: z.string().datetime().nullable(),
  lastLoginAt: z.string().datetime().nullable(),
  deleteAccountRequestedAt: z.string().datetime().nullable(),
  notificationPreferences: notificationPreferencesSchema,
  policyAgreements: policyAgreementsSchema,
  createdAt: z.string().datetime(),
});

export type UserPublic = z.infer<typeof userPublicSchema>;

export const timeZoneSchema = z
  .string()
  .trim()
  .min(1, "Choose a valid time zone.")
  .max(100)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid time zone.");

const optionalPlace = z
  .string()
  .trim()
  .max(100)
  .nullable()
  .transform((value) => (value ? value : null))
  .optional();

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
    timeZone: timeZoneSchema.optional().nullable(),
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
