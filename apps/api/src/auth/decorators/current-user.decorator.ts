import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth-principal';

/**
 * The authenticated principal, as attached by `JwtStrategy`. Only usable on
 * routes the `JwtAuthGuard` protects — a `@Public()` route has no principal.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthPrincipal => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();
    return request.user as AuthPrincipal;
  },
);
