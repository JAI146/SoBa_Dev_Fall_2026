import type { Response } from 'express';
import {
  clearRefreshCookie,
  setRefreshCookie,
  REFRESH_COOKIE_PATH,
} from './refresh-cookie';
import type { IssuedSession } from './session.service';

describe('dashboard refresh cookie', () => {
  it('is scoped to the actual prefixed refresh endpoint', () => {
    expect(REFRESH_COOKIE_PATH).toBe('/api/auth/refresh');
    const response = { cookie: jest.fn(), clearCookie: jest.fn() };
    const session = {
      refreshToken: 'test-refresh',
      expiresAt: new Date(),
    } as IssuedSession;
    setRefreshCookie(response as unknown as Response, session, false);
    expect(response.cookie).toHaveBeenCalledWith(
      'pm_refresh_token',
      'test-refresh',
      expect.objectContaining({
        path: '/api/auth/refresh',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
      }),
    );
    clearRefreshCookie(response as unknown as Response, false);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'pm_refresh_token',
      expect.objectContaining({ path: '/api/auth/refresh' }),
    );
  });

  it('keeps production cookies secure', () => {
    const response = { cookie: jest.fn() };
    setRefreshCookie(
      response as unknown as Response,
      { refreshToken: 'test', expiresAt: new Date() } as IssuedSession,
      true,
    );
    expect(response.cookie).toHaveBeenCalledWith(
      'pm_refresh_token',
      'test',
      expect.objectContaining({ secure: true, httpOnly: true }),
    );
  });
});
