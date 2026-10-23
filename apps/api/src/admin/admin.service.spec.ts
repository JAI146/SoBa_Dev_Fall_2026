import { NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  AdminPermission,
  AdminRole,
  AuditAction,
  rolePermissions,
  Tier,
  UserStatus,
  UserType,
  OnboardingStatus,
  type AdminUserStatusUpdateInput,
} from '@purposemint/contracts';
import type { AuditService } from '../audit/audit.service';
import type { AuthPrincipal } from '../auth/auth-principal';
import {
  SessionRevokedReason,
  type SessionService,
} from '../auth/session.service';
import type { User } from '../entities/user.entity';
import { AdminService } from './admin.service';

const principal = { userId: 'admin-1' } as AuthPrincipal;
const context = { ipAddress: '127.0.0.1' } as Parameters<
  AdminService['updateUserStatus']
>[3];

function customer(overrides: Partial<User> = {}): User {
  return {
    id: '7b0d5c2e-4a40-4f55-9c1a-2f7b7e0f1d11',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: null,
    email: 'ada@purposemint.local',
    userType: UserType.CUSTOMER,
    tier: Tier.FREE,
    status: UserStatus.ACTIVE,
    onboardingStatus: OnboardingStatus.COMPLETED,
    emailVerifiedAt: new Date('2026-01-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    timeZone: null,
    ...overrides,
  } as User;
}

function setup(
  user: User | null,
  sessionRows: { userId: string; lastSessionAt: Date }[] = [],
  customRole: { permissions: string[] } | null = null,
  overrides: { user?: string[]; role?: string[] } = {},
) {
  const users = {
    findOne: jest.fn().mockResolvedValue(user),
    save: jest.fn().mockImplementation((row: User) => Promise.resolve(row)),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const sessions = { revokeAllForUser: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(4) };
  const sessionQuery = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(sessionRows),
  };
  const userSessions = {
    createQueryBuilder: jest.fn().mockReturnValue(sessionQuery),
  };
  const customRoles = { findOne: jest.fn().mockResolvedValue(customRole) };
  const userPermissionOverrides = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        overrides.user ? { permissions: overrides.user } : null,
      ),
  };
  const rolePermissionOverrides = {
    findOne: jest
      .fn()
      .mockResolvedValue(
        overrides.role ? { permissions: overrides.role } : null,
      ),
  };
  const unused = {} as never;
  const service = new AdminService(
    unused,
    users as never,
    customRoles as never,
    rolePermissionOverrides as never,
    userPermissionOverrides as never,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    unused,
    userSessions as never,
    audit as unknown as AuditService,
    sessions as unknown as SessionService,
    config as unknown as ConfigService<never, true>,
  );
  return { service, users, audit, sessions, customRoles };
}

function update(
  service: AdminService,
  id: string,
  status: AdminUserStatusUpdateInput['status'],
) {
  return service.updateUserStatus(principal, id, { status }, context);
}

describe('AdminService.updateUserStatus', () => {
  it('suspends a customer, revokes their sessions, and audits it', async () => {
    const user = customer();
    const { service, users, audit, sessions } = setup(user);

    const result = await update(service, user.id, UserStatus.SUSPENDED);

    expect(result.status).toBe(UserStatus.SUSPENDED);
    expect(users.save).toHaveBeenCalledTimes(1);
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith(
      user.id,
      SessionRevokedReason.LOGOUT_ALL,
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.ADMIN_USER_SUSPENDED,
        actorUserId: principal.userId,
        entityId: user.id,
        metadata: {
          previousStatus: UserStatus.ACTIVE,
          status: UserStatus.SUSPENDED,
        },
      }),
    );
  });

  it('reactivates a verified customer to active without revoking sessions', async () => {
    const user = customer({ status: UserStatus.SUSPENDED });
    const { service, audit, sessions } = setup(user);

    const result = await update(service, user.id, UserStatus.ACTIVE);

    expect(result.status).toBe(UserStatus.ACTIVE);
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: AuditAction.ADMIN_USER_REACTIVATED }),
    );
  });

  it('returns an unverified customer to pending_email on reactivation', async () => {
    const user = customer({
      status: UserStatus.SUSPENDED,
      emailVerifiedAt: null,
    });
    const { service, audit } = setup(user);

    const result = await update(service, user.id, UserStatus.ACTIVE);

    expect(result.status).toBe(UserStatus.PENDING_EMAIL);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: {
          previousStatus: UserStatus.SUSPENDED,
          status: UserStatus.PENDING_EMAIL,
        },
      }),
    );
  });

  it('skips the write, revoke, and audit when the status does not change', async () => {
    const user = customer({ status: UserStatus.SUSPENDED });
    const { service, users, audit, sessions } = setup(user);

    const result = await update(service, user.id, UserStatus.SUSPENDED);

    expect(result.status).toBe(UserStatus.SUSPENDED);
    expect(users.save).not.toHaveBeenCalled();
    expect(sessions.revokeAllForUser).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('reports lastSeenAt as the later of login and newest session', async () => {
    const user = customer({
      lastLoginAt: new Date('2026-09-01T00:00:00.000Z'),
    });
    const { service } = setup(user, [
      { userId: user.id, lastSessionAt: new Date('2026-10-01T08:00:00.000Z') },
    ]);

    const result = await update(service, user.id, UserStatus.ACTIVE);

    expect(result.lastSeenAt).toBe('2026-10-01T08:00:00.000Z');
  });

  it('only looks up customer accounts and 404s otherwise', async () => {
    const { service, users } = setup(null);

    await expect(
      update(service, 'staff-id', UserStatus.SUSPENDED),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(users.findOne).toHaveBeenCalledWith({
      where: { id: 'staff-id', userType: UserType.CUSTOMER },
    });
  });
});

describe('AdminService.myPermissions', () => {
  it('returns the built-in role permissions without a custom role', async () => {
    const { service, customRoles } = setup(null);

    const result = await service.myPermissions({
      ...principal,
      adminRole: AdminRole.SUPPORT,
      customRoleId: null,
    });

    expect(result.permissions).toEqual([...rolePermissions[AdminRole.SUPPORT]]);
    expect(customRoles.findOne).not.toHaveBeenCalled();
  });

  it('lets an assigned custom role replace the built-in permissions', async () => {
    const { service } = setup(null, [], {
      permissions: [AdminPermission.USER_MANAGEMENT_EDIT],
    });

    const result = await service.myPermissions({
      ...principal,
      adminRole: AdminRole.SUPPORT,
      customRoleId: 'custom-role-1',
    });

    expect(result.permissions).toEqual([AdminPermission.USER_MANAGEMENT_EDIT]);
  });

  it('grants nothing when the custom role is gone, like the permission guard', async () => {
    const { service } = setup(null, [], null);

    const result = await service.myPermissions({
      ...principal,
      adminRole: AdminRole.EDITOR,
      customRoleId: 'deleted-role',
    });

    expect(result.permissions).toEqual([]);
  });

  it('lets a per-staff override win over every role', async () => {
    const { service } = setup(null, [], null, {
      user: [AdminPermission.REPORTS_VIEW],
    });

    const result = await service.myPermissions({
      ...principal,
      adminRole: AdminRole.SUPPORT,
      customRoleId: 'custom-role-1',
    });

    expect(result.permissions).toEqual([AdminPermission.REPORTS_VIEW]);
  });

  it('uses the edited permissions of a built-in role', async () => {
    const { service } = setup(null, [], null, {
      role: [AdminPermission.USER_MANAGEMENT_VIEW],
    });

    const result = await service.myPermissions({
      ...principal,
      adminRole: AdminRole.SUPPORT,
      customRoleId: null,
    });

    expect(result.permissions).toEqual([AdminPermission.USER_MANAGEMENT_VIEW]);
  });
});
