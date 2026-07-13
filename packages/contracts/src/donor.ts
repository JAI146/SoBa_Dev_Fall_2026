import { z } from "zod";

export const restrictDonorSchema = z.object({
  restricted: z.boolean(),
});

export type RestrictDonorInput = z.infer<typeof restrictDonorSchema>;

export const donorListQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "suspended", "pending_email"]).optional(),
  userType: z.enum(["visitor", "sponsor"]).optional(),
});

export type DonorListQuery = z.infer<typeof donorListQuerySchema>;

export interface DonorListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  profileImageUrl: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  userType: string;
  status: string;
  accountRestricted: boolean;
  createdAt: string;
}

export interface DonorDetail extends DonorListItem {
  updatedAt: string;
  policyAgreements: Record<string, string>;
}

export interface DonorDashboardOverview {
  familiesSponsored: number;
  activeSponsorships: number;
  partialSponsorships: number;
  completedSponsorships: number;
  messagesPendingModeration: number;
  approvedMessages: number;
  adminNotices: number;
}

export interface DonorNotificationPreferences {
  sponsorshipUpdates: boolean;
  messageAlerts: boolean;
  adminNotices: boolean;
}

export const defaultDonorNotificationPreferences: DonorNotificationPreferences = {
  sponsorshipUpdates: true,
  messageAlerts: true,
  adminNotices: true,
};

export interface DonorAccountSettings {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string | null;
  country: string | null;
  city: string | null;
  notificationPreferences: DonorNotificationPreferences;
  deleteAccountRequested: boolean;
}

export const updateDonorAccountSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  country: z.string().trim().min(1, "Country is required").max(100),
  city: z.string().trim().max(100).optional().nullable(),
});

export type UpdateDonorAccountInput = z.infer<typeof updateDonorAccountSchema>;

export const updateDonorPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type UpdateDonorPasswordInput = z.infer<typeof updateDonorPasswordSchema>;

export const updateDonorNotificationPreferencesSchema = z.object({
  sponsorshipUpdates: z.boolean(),
  messageAlerts: z.boolean(),
  adminNotices: z.boolean(),
});

export type UpdateDonorNotificationPreferencesInput = z.infer<
  typeof updateDonorNotificationPreferencesSchema
>;
