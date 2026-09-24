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
      const customRole = user.customRoleId
        ? await this.customRoles.findOne({ where: { id: user.customRoleId } })
        : null;
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
