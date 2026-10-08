import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { AdminRole, UserType } from '@purposemint/contracts';
import type { AuthPrincipal } from '../auth/auth-principal';

/** Replace this policy with resource permissions when that shared system lands. */
@Injectable()
export class SubscriptionAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<{ user?: AuthPrincipal }>();
    if (
      user?.userType !== UserType.ADMIN ||
      user.adminRole !== AdminRole.SUPER_ADMIN
    )
      throw new ForbiddenException(
        'Subscription management requires an authorized administrator.',
      );
    return true;
  }
}
