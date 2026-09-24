import type {
  AdminRoleValue,
  UserStatusValue,
  UserTypeValue,
} from '@purposemint/contracts';

/**
 * What `JwtStrategy.validate` attaches to the request. Deliberately lean —
 * never the raw entity, so no handler can accidentally serialise a hash.
 */
export interface AuthPrincipal {
  userId: string;
  /** `user_sessions.id` of the session this access token belongs to. */
  sessionId: string;
  userType: UserTypeValue;
  adminRole: AdminRoleValue | null;
  customRoleId: string | null;
  status: UserStatusValue;
  emailVerified: boolean;
}

/** Claims carried inside the access JWT. Nothing else belongs here. */
export interface AccessTokenPayload {
  sub: string;
  sid: string;
  userType: UserTypeValue;
  adminRole: AdminRoleValue | null;
}
