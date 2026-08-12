import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

/**
 * Rate limiting for the credential endpoints, keyed on IP **and** email.
 *
 * The globally registered `ThrottlerGuard` already counts by IP alone. Adding
 * this guard to a route makes a second count under `ip|email`, so one noisy
 * office network cannot lock out everyone behind it, and one targeted address
 * cannot be ground down from a rotating pool of IPs.
 */
@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip = typeof req.ip === 'string' ? req.ip : 'unknown-ip';
    const body = req.body as Record<string, unknown> | undefined;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    return email ? `${ip}|${email}` : ip;
  }
}
