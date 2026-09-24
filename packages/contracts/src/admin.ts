import { z } from "zod";
import {
  checklistCategoryValues,
  adminRoleValues,
  habitCategoryValues,
  habitFrequencyValues,
  onboardingStatusValues,
  pathwayApplicationStatusValues,
  pathwayVerificationMethodValues,
  tierValues,
  userStatusValues,
} from "./enums";
import { adminPermissionValues } from "./permissions";
import { paginationQuerySchema } from "./api-error";

const isoDate = z.string().datetime();

export const adminUsersQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(255).optional(),
});

const staffNameField = z.string().trim().min(1).max(100);
const staffEmailField = z.string().trim().toLowerCase().email().max(255);

export const adminStaffQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().max(255).optional(),
});

export const adminStaffCreateSchema = z.object({
  email: staffEmailField,
  password: z.string().min(8).max(128),
  firstName: staffNameField,
  lastName: staffNameField,
  adminRole: z.enum(adminRoleValues),
});

export const adminStaffUpdateSchema = z.object({
  email: staffEmailField.optional(),
  firstName: staffNameField.optional(),
  lastName: staffNameField.optional(),
  adminRole: z.enum(adminRoleValues).optional(),
  status: z.enum(["active", "suspended"] as const).optional(),
});

export const adminPathwayApplicationsQuerySchema = paginationQuerySchema.extend(
  {
    pathwayKey: z.string().trim().max(100).optional(),
    status: z.enum(pathwayApplicationStatusValues).optional(),
  },
);

export const adminUpgradeIntentsQuerySchema = paginationQuerySchema;

export const adminChecklistUpdateSchema = z.object({
  isComplete: z.boolean(),
});

export const adminCountGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
});

export const adminOverviewResponseSchema = z.object({
  totalUsers: z.number().int().min(0),
  usersByTier: z.array(
    adminCountGroupSchema.extend({ key: z.enum(tierValues) }),
  ),
  onboardingCompletionRate: z.number().min(0).max(100),
  submittedPathwayApplications: z.number().int().min(0),
  pathwayApplicationsByPathway: z.array(adminCountGroupSchema),
  upgradeIntentsByPlan: z.array(
    adminCountGroupSchema.extend({ key: z.enum(tierValues) }),
  ),
  activeUsers: z.object({
    count: z.number().int().min(0),
    windowDays: z.number().int().positive(),
  }),
});

export const adminUserListItemSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  tier: z.enum(tierValues),
  status: z.enum(userStatusValues),
  onboardingStatus: z.enum(onboardingStatusValues),
  emailVerifiedAt: isoDate.nullable(),
  createdAt: isoDate,
  timeZone: z.string().nullable(),
});

const paginationFields = {
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(1),
};

export const adminStaffListItemSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  adminRole: z.enum(adminRoleValues),
  status: z.enum(["active", "suspended"] as const),
  emailVerifiedAt: isoDate.nullable(),
  createdAt: isoDate,
  lastLoginAt: isoDate.nullable(),
});

export const adminStaffResponseSchema = z.object({
  items: z.array(adminStaffListItemSchema),
  ...paginationFields,
});

export const adminCustomRoleCreateSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).default(""),
  permissions: z.array(z.enum(adminPermissionValues)).min(1),
});

export const adminCustomRoleUpdateSchema = adminCustomRoleCreateSchema.partial();

export const adminCustomRoleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  permissions: z.array(z.enum(adminPermissionValues)),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const adminCustomRolesResponseSchema = z.object({
  items: z.array(adminCustomRoleSchema),
});

export const adminUsersResponseSchema = z.object({
  items: z.array(adminUserListItemSchema),
  ...paginationFields,
});

export const adminUserGoalSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  targetAmount: z.number(),
  savedAmount: z.number(),
  isActive: z.boolean(),
  isFocus: z.boolean(),
  isPathwayEligible: z.boolean(),
  createdAt: isoDate,
});

export const adminUserHabitSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  frequency: z.enum(habitFrequencyValues),
  category: z.enum(habitCategoryValues),
  isActive: z.boolean(),
  createdAt: isoDate,
});

export const adminUserDetailResponseSchema = adminUserListItemSchema.extend({
  country: z.string().nullable(),
  state: z.string().nullable(),
  city: z.string().nullable(),
  lastLoginAt: isoDate.nullable(),
  goals: z.array(adminUserGoalSchema),
  habits: z.array(adminUserHabitSchema),
  activityCounts: z.object({
    goals: z.number().int().min(0),
    activeGoals: z.number().int().min(0),
    habits: z.number().int().min(0),
    activeHabits: z.number().int().min(0),
    habitCompletions: z.number().int().min(0),
    savingsEntries: z.number().int().min(0),
    pathwayApplications: z.number().int().min(0),
    submittedPathwayApplications: z.number().int().min(0),
    reflections: z.number().int().min(0),
  }),
});

export const adminApplicantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  timeZone: z.string().nullable(),
});

export const adminPathwaySummarySchema = z.object({
  key: z.string(),
  title: z.string(),
  minimumAmount: z.number(),
});

export const adminSelectedPartnerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export const adminPathwayApplicationListItemSchema = z.object({
  id: z.string().uuid(),
  applicant: adminApplicantSchema,
  pathway: adminPathwaySummarySchema,
  attestedAmount: z.number().nullable(),
  verificationMethod: z.enum(pathwayVerificationMethodValues),
  status: z.enum(pathwayApplicationStatusValues),
  selectedPartners: z.array(adminSelectedPartnerSchema),
  checklistProgress: z.object({
    completed: z.number().int().min(0),
    total: z.number().int().min(0),
  }),
  submittedAt: isoDate.nullable(),
  createdAt: isoDate,
});

export const adminPathwayApplicationsResponseSchema = z.object({
  items: z.array(adminPathwayApplicationListItemSchema),
  pathways: z.array(z.object({ key: z.string(), title: z.string() })),
  ...paginationFields,
});

export const adminPartnerDetailSchema = adminSelectedPartnerSchema.extend({
  partnerType: z.string(),
  description: z.string(),
  locationLabel: z.string(),
  capabilityTags: z.array(z.string()),
});

export const adminChecklistItemSchema = z.object({
  id: z.string().uuid(),
  category: z.enum(checklistCategoryValues),
  title: z.string(),
  description: z.string(),
  isComplete: z.boolean(),
  completedAt: isoDate.nullable(),
  sortOrder: z.number().int(),
});

export const adminPathwayApplicationDetailResponseSchema = z.object({
  id: z.string().uuid(),
  applicant: adminApplicantSchema,
  pathway: adminPathwaySummarySchema,
  attestedAmount: z.number().nullable(),
  attestationAcceptedAt: isoDate.nullable(),
  verificationMethod: z.enum(pathwayVerificationMethodValues),
  status: z.enum(pathwayApplicationStatusValues),
  submittedAt: isoDate.nullable(),
  selectedPartners: z.array(adminPartnerDetailSchema),
  checklistItems: z.array(adminChecklistItemSchema),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const adminUpgradeIntentSchema = z.object({
  id: z.string().uuid(),
  user: adminApplicantSchema,
  planKey: z.enum(tierValues),
  planName: z.string(),
  createdAt: isoDate,
});

export const adminUpgradeIntentsResponseSchema = z.object({
  groups: z.array(adminCountGroupSchema.extend({ key: z.enum(tierValues) })),
  items: z.array(adminUpgradeIntentSchema),
  ...paginationFields,
});

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminStaffQuery = z.infer<typeof adminStaffQuerySchema>;
export type AdminStaffCreateInput = z.infer<typeof adminStaffCreateSchema>;
export type AdminStaffUpdateInput = z.infer<typeof adminStaffUpdateSchema>;
export type AdminStaffListItem = z.infer<typeof adminStaffListItemSchema>;
export type AdminStaffResponse = z.infer<typeof adminStaffResponseSchema>;
export type AdminCustomRoleCreateInput = z.infer<typeof adminCustomRoleCreateSchema>;
export type AdminCustomRoleUpdateInput = z.infer<typeof adminCustomRoleUpdateSchema>;
export type AdminCustomRole = z.infer<typeof adminCustomRoleSchema>;
export type AdminCustomRolesResponse = z.infer<typeof adminCustomRolesResponseSchema>;
export type AdminPathwayApplicationsQuery = z.infer<
  typeof adminPathwayApplicationsQuerySchema
>;
export type AdminUpgradeIntentsQuery = z.infer<
  typeof adminUpgradeIntentsQuerySchema
>;
export type AdminChecklistUpdateInput = z.infer<
  typeof adminChecklistUpdateSchema
>;
export type AdminOverviewResponse = z.infer<typeof adminOverviewResponseSchema>;
export type AdminUserListItem = z.infer<typeof adminUserListItemSchema>;
export type AdminUsersResponse = z.infer<typeof adminUsersResponseSchema>;
export type AdminUserDetailResponse = z.infer<
  typeof adminUserDetailResponseSchema
>;
export type AdminPathwayApplicationListItem = z.infer<
  typeof adminPathwayApplicationListItemSchema
>;
export type AdminPathwayApplicationsResponse = z.infer<
  typeof adminPathwayApplicationsResponseSchema
>;
export type AdminChecklistItem = z.infer<typeof adminChecklistItemSchema>;
export type AdminPathwayApplicationDetailResponse = z.infer<
  typeof adminPathwayApplicationDetailResponseSchema
>;
export type AdminUpgradeIntentsResponse = z.infer<
  typeof adminUpgradeIntentsResponseSchema
>;
