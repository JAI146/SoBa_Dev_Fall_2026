import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth-principal';
import { ROLES_KEY, type RoleRequirement } from '../decorators/roles.decorator';

/**
 * No-op unless the handler carries `@Roles(...)`, so it is safe to register
 * globally alongside `JwtAuthGuard`.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<RoleRequirement[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required?.length) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();
    const allowed =
      !!user &&
      required.some(
        (role) => role === user.userType || role === user.adminRole,
      );

    if (!allowed) {
      throw new ForbiddenException("This one isn't available on your account.");
    }
    return true;
  }
}
