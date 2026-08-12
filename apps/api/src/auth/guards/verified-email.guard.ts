import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import type { Request } from 'express';
import type { AuthPrincipal } from '../auth-principal';

/**
 * Applied to **nothing** today, and that is on purpose.
 *
 * Someone whose email is still `pending_email` can register, sign in and work
 * through onboarding — being unverified is not a reason to lock them out of
 * the product. This guard is here for the routes that will genuinely need it
 * later: money movement, KYC and subscription changes.
 */
@Injectable()
export class VerifiedEmailGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthPrincipal }>();

    if (!user?.emailVerified) {
      throw new ForbiddenException(
        "Let's confirm your email first — we sent a code when you signed up, and you can ask for a fresh one any time.",
      );
    }
    return true;
  }
}
