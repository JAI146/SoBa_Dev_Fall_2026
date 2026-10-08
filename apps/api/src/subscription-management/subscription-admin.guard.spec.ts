import { type ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { AdminRole, UserType } from '@purposemint/contracts';
import { SubscriptionAdminGuard } from './subscription-admin.guard';
import { SubscriptionManagementController } from './subscription-management.controller';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

describe('subscription administration authorization', () => {
  const guard = new SubscriptionAdminGuard();
  function context(user?: {
    userType: string;
    adminRole: string | null;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as unknown as ExecutionContext;
  }
  it.each([
    undefined,
    { userType: UserType.CUSTOMER, adminRole: null },
    { userType: UserType.CUSTOMER, adminRole: AdminRole.SUPER_ADMIN },
    { userType: UserType.ADMIN, adminRole: null },
  ])('rejects unauthorized principals: %s', (user) => {
    expect(() => guard.canActivate(context(user))).toThrow(
      'authorized administrator',
    );
  });
  it('allows an authenticated super administrator', () => {
    expect(
      guard.canActivate(
        context({ userType: UserType.ADMIN, adminRole: AdminRole.SUPER_ADMIN }),
      ),
    ).toBe(true);
  });
  it('protects every endpoint with both the admin role and feature policy', () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, SubscriptionManagementController),
    ).toEqual([UserType.ADMIN]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, SubscriptionManagementController),
    ).toContain(SubscriptionAdminGuard);
    for (const method of Object.getOwnPropertyNames(
      SubscriptionManagementController.prototype,
    ).filter((name) => name !== 'constructor')) {
      const handler: unknown = (
        SubscriptionManagementController.prototype as unknown as Record<
          string,
          unknown
        >
      )[method];
      expect(Reflect.getMetadata(ROLES_KEY, handler as object)).toBeUndefined();
      expect(
        Reflect.getMetadata(GUARDS_METADATA, handler as object),
      ).toBeUndefined();
    }
  });
});
