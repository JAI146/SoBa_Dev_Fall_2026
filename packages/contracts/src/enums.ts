/**
 * Platform-neutral enums shared by the API, the mobile app and the dashboard.
 * Plain const objects — no TypeORM, no NestJS, no framework imports.
 * The API entities import these rather than declaring their own copies.
 */

export const UserType = {
  CUSTOMER: "customer",
  ADMIN: "admin",
} as const;

export const userTypeValues = [UserType.CUSTOMER, UserType.ADMIN] as const;

export type UserTypeValue = (typeof UserType)[keyof typeof UserType];

export const UserStatus = {
  PENDING_EMAIL: "pending_email",
  ACTIVE: "active",
  SUSPENDED: "suspended",
} as const;

export const userStatusValues = [
  UserStatus.PENDING_EMAIL,
  UserStatus.ACTIVE,
  UserStatus.SUSPENDED,
] as const;

export type UserStatusValue = (typeof UserStatus)[keyof typeof UserStatus];

export const AdminRole = {
  SUPER_ADMIN: "super_admin",
  MANAGER: "manager",
  AUDITOR: "auditor",
  EDITOR: "editor",
  SUPPORT: "support",
} as const;

export const adminRoleValues = [
  AdminRole.SUPER_ADMIN,
  AdminRole.MANAGER,
  AdminRole.AUDITOR,
  AdminRole.EDITOR,
  AdminRole.SUPPORT,
] as const;

export type AdminRoleValue = (typeof AdminRole)[keyof typeof AdminRole];

export const OnboardingStatus = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const onboardingStatusValues = [
  OnboardingStatus.NOT_STARTED,
  OnboardingStatus.IN_PROGRESS,
  OnboardingStatus.COMPLETED,
] as const;

export type OnboardingStatusValue =
  (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

/**
 * Subscription tier. Written only by the subscription module (Phase 3).
 * Never read to make an authorization decision.
 */
export const Tier = {
  FREE: "free",
  GROWTH: "growth",
  ELEVATE: "elevate",
} as const;

export const tierValues = [Tier.FREE, Tier.GROWTH, Tier.ELEVATE] as const;

export type TierValue = (typeof Tier)[keyof typeof Tier];

export const HabitFrequency = {
  DAILY: "daily",
  WEEKLY: "weekly",
  AS_NEEDED: "as_needed",
} as const;

export const habitFrequencyValues = [
  HabitFrequency.DAILY,
  HabitFrequency.WEEKLY,
  HabitFrequency.AS_NEEDED,
] as const;

export type HabitFrequencyValue =
  (typeof HabitFrequency)[keyof typeof HabitFrequency];

export const HabitCategory = {
  MONEY: "money",
  MINDSET: "mindset",
  MOTIVATION: "motivation",
} as const;

export const habitCategoryValues = [
  HabitCategory.MONEY,
  HabitCategory.MINDSET,
  HabitCategory.MOTIVATION,
] as const;

export type HabitCategoryValue =
  (typeof HabitCategory)[keyof typeof HabitCategory];

export const PathwayApplicationStatus = {
  DRAFT: "draft",
  SUBMITTED: "submitted",
} as const;
export const pathwayApplicationStatusValues = [PathwayApplicationStatus.DRAFT, PathwayApplicationStatus.SUBMITTED] as const;
export type PathwayApplicationStatusValue = (typeof PathwayApplicationStatus)[keyof typeof PathwayApplicationStatus];

export const PathwayVerificationMethod = { SELF_ATTESTED: "self_attested" } as const;
export const pathwayVerificationMethodValues = [PathwayVerificationMethod.SELF_ATTESTED] as const;
export type PathwayVerificationMethodValue = (typeof PathwayVerificationMethod)[keyof typeof PathwayVerificationMethod];

export const ChecklistCategory = {
  DOCUMENTATION: "documentation",
  FINANCIAL_REVIEW: "financial_review",
  CONSULTATION: "consultation",
  NEXT_STEPS: "next_steps",
} as const;
export const checklistCategoryValues = [ChecklistCategory.DOCUMENTATION, ChecklistCategory.FINANCIAL_REVIEW, ChecklistCategory.CONSULTATION, ChecklistCategory.NEXT_STEPS] as const;
export type ChecklistCategoryValue = (typeof ChecklistCategory)[keyof typeof ChecklistCategory];

export const ReflectionKind = {
  TEXT: "text",
  VOICE: "voice",
} as const;
export const reflectionKindValues = [
  ReflectionKind.TEXT,
  ReflectionKind.VOICE,
] as const;
export type ReflectionKindValue =
  (typeof ReflectionKind)[keyof typeof ReflectionKind];

/** Which client asked for the session. Decides refresh TTL and delivery channel. */
export const ClientType = {
  MOBILE: "mobile",
  DASHBOARD: "dashboard",
} as const;

export const clientTypeValues = [
  ClientType.MOBILE,
  ClientType.DASHBOARD,
] as const;

export type ClientTypeValue = (typeof ClientType)[keyof typeof ClientType];

export const OtpType = {
  EMAIL_VERIFICATION: "email_verification",
  PASSWORD_RESET: "password_reset",
} as const;

export const otpTypeValues = [
  OtpType.EMAIL_VERIFICATION,
  OtpType.PASSWORD_RESET,
] as const;

export type OtpTypeValue = (typeof OtpType)[keyof typeof OtpType];

export const AuditActorType = {
  USER: "user",
  ADMIN: "admin",
  SYSTEM: "system",
} as const;

export const auditActorTypeValues = [
  AuditActorType.USER,
  AuditActorType.ADMIN,
  AuditActorType.SYSTEM,
] as const;

export type AuditActorTypeValue =
  (typeof AuditActorType)[keyof typeof AuditActorType];

export const AuditOutcome = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const;

export const auditOutcomeValues = [
  AuditOutcome.SUCCESS,
  AuditOutcome.FAILURE,
] as const;

export type AuditOutcomeValue =
  (typeof AuditOutcome)[keyof typeof AuditOutcome];

/** Actions written to `audit_events`. Kept as a closed set so queries stay honest. */
export const AuditAction = {
  // Track incentive reads, program creation/updates, eligibility reviews, and ledger events.
  INCENTIVES_VIEWED: "incentives.viewed",
  INCENTIVE_PROGRAM_UPDATED: "incentives.program_updated",
  INCENTIVE_REVIEWED: "incentives.reviewed",
  INCENTIVE_EVENT_RECORDED: "incentives.event_recorded",
  USER_REGISTERED: "user.registered",
  USER_LOGIN_SUCCEEDED: "user.login_succeeded",
  USER_LOGIN_FAILED: "user.login_failed",
  USER_EMAIL_VERIFIED: "user.email_verified",
  USER_PASSWORD_CHANGED: "user.password_changed",
  USER_PASSWORD_RESET: "user.password_reset",
  USER_LOGGED_OUT_ALL: "user.logged_out_all",
  SESSION_REFRESH_REUSE_DETECTED: "session.refresh_reuse_detected",
  USER_DELETION_REQUESTED: "user.deletion_requested",
  USER_DELETION_CANCELLED: "user.deletion_cancelled",
  ADMIN_OVERVIEW_VIEWED: "admin.overview_viewed",
  ADMIN_USERS_LISTED: "admin.users_listed",
  ADMIN_USER_VIEWED: "admin.user_viewed",
  ADMIN_STAFF_CREATED: "admin.staff_created",
  ADMIN_STAFF_UPDATED: "admin.staff_updated",
  ADMIN_STAFF_DEACTIVATED: "admin.staff_deactivated",
  ADMIN_STAFF_LISTED: "admin.staff_listed",
  ADMIN_CUSTOM_ROLES_LISTED: "admin.custom_roles_listed",
  ADMIN_CUSTOM_ROLE_CREATED: "admin.custom_role_created",
  ADMIN_CUSTOM_ROLE_UPDATED: "admin.custom_role_updated",
  ADMIN_CUSTOM_ROLE_DELETED: "admin.custom_role_deleted",
  ADMIN_PATHWAY_APPLICATIONS_LISTED: "admin.pathway_applications_listed",
  ADMIN_PATHWAY_APPLICATION_VIEWED: "admin.pathway_application_viewed",
  ADMIN_PATHWAY_CHECKLIST_UPDATED: "admin.pathway_checklist_updated",
  ADMIN_UPGRADE_INTENTS_LISTED: "admin.upgrade_intents_listed",
} as const;

export type AuditActionValue = (typeof AuditAction)[keyof typeof AuditAction];
