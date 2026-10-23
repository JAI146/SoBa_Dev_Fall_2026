import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole, AdminPermission, UserType } from '@purposemint/contracts';
import type { Repository } from 'typeorm';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { AdminRolePermission } from '../entities/admin-role-permission.entity';
import { AdminUserPermission } from '../entities/admin-user-permission.entity';
import { CustomRole } from '../entities/custom-role.entity';
import { SubscriptionManagementController } from './subscription-management.controller';

describe('subscription administration permissions', () => {
  const reflector = new Reflector();
  const full = ['createPlan', 'updatePlan'];
  const edit = ['assign', 'change', 'cancel', 'clear', 'payment'];
  const methods = Object.getOwnPropertyNames(
    SubscriptionManagementController.prototype,
  ).filter((name) => name !== 'constructor');
  function context(
    method: string,
    role: string | null,
    customRoleId: string | null = null,
    userType: string = UserType.ADMIN,
  ): ExecutionContext {
    return {
      getClass: () => SubscriptionManagementController,
      getHandler: () =>
        (
          SubscriptionManagementController.prototype as unknown as Record<
            string,
            object
          >
        )[method],
      switchToHttp: () => ({
        getRequest: () => ({
          user: { userType, adminRole: role, customRoleId },
        }),
      }),
    } as unknown as ExecutionContext;
  }
  function guard(
    permissions: string[] | null = null,
    roleOverride: string[] | null = null,
    userOverride: string[] | null = null,
  ) {
    return new PermissionsGuard(
      reflector,
      {
        findOne: jest
          .fn()
          .mockResolvedValue(permissions === null ? null : { permissions }),
      } as unknown as Repository<CustomRole>,
      {
        findOne: jest
          .fn()
          .mockResolvedValue(
            roleOverride === null ? null : { permissions: roleOverride },
          ),
      } as unknown as Repository<AdminRolePermission>,
      {
        findOne: jest
          .fn()
          .mockResolvedValue(
            userOverride === null ? null : { permissions: userOverride },
          ),
      } as unknown as Repository<AdminUserPermission>,
    );
  }
  it.each(methods)('requires the correct permission on %s', (method) => {
    const required = reflector.getAllAndOverride<unknown>(PERMISSIONS_KEY, [
      context(method, null).getHandler(),
      SubscriptionManagementController,
    ]);
    expect(required).toEqual([
      full.includes(method)
        ? AdminPermission.SUBSCRIPTIONS_FULL
        : edit.includes(method)
          ? AdminPermission.SUBSCRIPTIONS_EDIT
          : AdminPermission.SUBSCRIPTIONS_VIEW,
    ]);
    expect(
      Reflect.getMetadata(ROLES_KEY, SubscriptionManagementController),
    ).toEqual([UserType.ADMIN]);
  });
  it('respects a role override that removes default access', async () => {
    await expect(
      guard(null, []).canActivate(context('detail', AdminRole.SUPER_ADMIN)),
    ).rejects.toThrow();
  });
  it('respects an individual override above a custom role', async () => {
    await expect(
      guard([AdminPermission.SUBSCRIPTIONS_FULL], null, []).canActivate(
        context('detail', AdminRole.SUPER_ADMIN, 'custom-role'),
      ),
    ).rejects.toThrow();
    await expect(
      guard([], null, [AdminPermission.SUBSCRIPTIONS_VIEW]).canActivate(
        context('detail', AdminRole.EDITOR, 'custom-role'),
      ),
    ).resolves.toBe(true);
  });
  it('requires an administrator even when permission grants are present', () => {
    expect(() =>
      new RolesGuard(reflector).canActivate(
        context('detail', AdminRole.SUPER_ADMIN, null, UserType.CUSTOMER),
      ),
    ).toThrow();
  });
  it.each(methods)(
    'allows full access to a built-in super admin on %s',
    async (method) => {
      await expect(
        guard().canActivate(context(method, AdminRole.SUPER_ADMIN)),
      ).resolves.toBe(true);
    },
  );
  it('lets managers change subscriptions but not configure plans', async () => {
    await expect(
      guard().canActivate(context('change', AdminRole.MANAGER)),
    ).resolves.toBe(true);
    await expect(
      guard().canActivate(context('updatePlan', AdminRole.MANAGER)),
    ).rejects.toThrow();
  });
  it('lets auditors view subscriptions without modifying them', async () => {
    await expect(
      guard().canActivate(context('detail', AdminRole.AUDITOR)),
    ).resolves.toBe(true);
    await expect(
      guard().canActivate(context('payment', AdminRole.AUDITOR)),
    ).rejects.toThrow();
  });
  it.each(methods)(
    'does not let a restricted custom role inherit super-admin access on %s',
    async (method) => {
      await expect(
        guard([]).canActivate(
          context(method, AdminRole.SUPER_ADMIN, 'custom-role'),
        ),
      ).rejects.toThrow();
    },
  );
  it('honors custom-role grants and permission ranks', async () => {
    const custom = guard([AdminPermission.SUBSCRIPTIONS_EDIT]);
    await expect(
      custom.canActivate(context('detail', AdminRole.EDITOR, 'custom-role')),
    ).resolves.toBe(true);
    await expect(
      custom.canActivate(context('change', AdminRole.EDITOR, 'custom-role')),
    ).resolves.toBe(true);
    await expect(
      custom.canActivate(
        context('updatePlan', AdminRole.EDITOR, 'custom-role'),
      ),
    ).rejects.toThrow();
  });
  it('denies a missing custom role rather than falling back to super admin', async () => {
    await expect(
      guard().canActivate(
        context('detail', AdminRole.SUPER_ADMIN, 'missing-role'),
      ),
    ).rejects.toThrow();
  });
});
