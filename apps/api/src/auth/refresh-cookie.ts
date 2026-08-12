import type { CookieOptions, Response } from 'express';
import type { IssuedSession } from './session.service';

export const REFRESH_COOKIE_NAME = 'pm_refresh_token';

/**
 * Scoped so the browser only ever sends the refresh token to the one endpoint
 * that consumes it. Nothing else on the API sees it.
 */
export const REFRESH_COOKIE_PATH = '/api/auth/refresh';

function cookieOptions(isProduction: boolean): CookieOptions {
  return {
    httpOnly: true,
    // A Secure cookie is dropped outright over plain http, which is what the
    // dashboard runs on locally. Everywhere real, this is on.
    secure: isProduction,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
  };
}

export function setRefreshCookie(
  response: Response,
  session: IssuedSession,
  isProduction: boolean,
): void {
  response.cookie(REFRESH_COOKIE_NAME, session.refreshToken, {
    ...cookieOptions(isProduction),
    expires: session.expiresAt,
  });
}

export function clearRefreshCookie(
  response: Response,
  isProduction: boolean,
): void {
  response.clearCookie(REFRESH_COOKIE_NAME, cookieOptions(isProduction));
}
