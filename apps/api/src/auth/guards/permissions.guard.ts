import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request } from 'express';
import {
  hasAdminPermission,
  type AdminPermissionValue,
} from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth-principal';
import { Repository } from 'typeorm';
import { CustomRole } from '../../entities/custom-role.entity';
import { AdminRolePermission } from '../../entities/admin-role-permission.entity';
import { AdminUserPermission } from '../../entities/admin-user-permission.entity';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * No-op unless a handler declares permissions. Multiple permissions are
 * treated as alternatives so a route can accept equivalent access paths.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(CustomRole)
    private readonly customRoles: Repository<CustomRole>,
    @InjectRepository(AdminRolePermission)
    private readonly rolePermissionOverrides: Repository<AdminRolePermission>,
    @InjectRepository(AdminUserPermission)
    private readonly userPermissionOverrides: Repository<AdminUserPermission>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<AdminPermissionValue[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();
    let allowed = false;
    if (user) {
      const userOverride = await this.userPermissionOverrides.findOne({
        where: { userId: user.userId },
      });
      if (userOverride) {
        allowed = required.some((permission) =>
          hasAdminPermission(null, permission, userOverride.permissions),
        );
      } else {
        const customRole = user.customRoleId
          ? await this.customRoles.findOne({
              where: { id: user.customRoleId },
            })
          : null;
        const roleOverride =
          !customRole && user.adminRole
            ? await this.rolePermissionOverrides.findOne({
                where: { roleKey: user.adminRole },
              })
            : null;
        allowed = required.some((permission) =>
          customRole
            ? hasAdminPermission(null, permission, customRole.permissions)
            : roleOverride
              ? hasAdminPermission(null, permission, roleOverride.permissions)
              : hasAdminPermission(user.adminRole, permission),
        );
      }
      const customRole = user.customRoleId
        ? await this.customRoles.findOne({ where: { id: user.customRoleId } })
        : null;
      if (user.customRoleId && !customRole) {
        throw new ForbiddenException(
          "This one isn't available on your account.",
        );
      }
      allowed = required.some((permission) =>
        customRole
          ? hasAdminPermission(null, permission, customRole.permissions)
          : hasAdminPermission(user.adminRole, permission),
      );
    }

    if (!allowed) {
      throw new ForbiddenException("This one isn't available on your account.");
    }
    return true;
  }
}
