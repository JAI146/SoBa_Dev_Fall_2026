import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type UserPublic,
} from '@purposemint/contracts';
import type { User } from '../../entities/user.entity';

/**
 * The single conversion from entity to wire shape. Controllers never return an
 * entity, so `passwordHash` has no path to a response body — and because the
 * column is `select: false`, it is not even loaded on the usual read paths.
 */
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    profileImageUrl: user.profileImageUrl,
    country: user.country,
    state: user.state,
    city: user.city,
    userType: user.userType,
    adminRole: user.adminRole,
    status: user.status,
    onboardingStatus: user.onboardingStatus,
    tier: user.tier,
    emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    deleteAccountRequestedAt:
      user.deleteAccountRequestedAt?.toISOString() ?? null,
    // Rows written before a preference existed fall back to the default rather
    // than reporting the key as missing.
    notificationPreferences: {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...user.notificationPreferences,
    },
    policyAgreements: user.policyAgreements ?? {},
    createdAt: user.createdAt.toISOString(),
  };
}
