import { ForbiddenException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  ClientType,
  OnboardingStatus,
  Tier,
  UserStatus,
  UserType,
} from '@purposemint/contracts';
import type { AuditService } from '../audit/audit.service';
import type { RequestContext } from '../common/request-context';
import type { User } from '../entities/user.entity';
import type { MailService } from '../mail/mail.service';
import type { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import type { OtpService } from './otp.service';
import type { SessionService } from './session.service';
import type { TokenService } from './token.service';

const context = { ipAddress: '127.0.0.1' } as RequestContext;

function customer(overrides: Partial<User> = {}): User {
  return {
    id: '7b0d5c2e-4a40-4f55-9c1a-2f7b7e0f1d11',
    email: 'ada@purposemint.local',
    firstName: 'Ada',
    lastName: 'Lovelace',
    displayName: null,
    userType: UserType.CUSTOMER,
    adminRole: null,
    tier: Tier.FREE,
    status: UserStatus.PENDING_EMAIL,
    onboardingStatus: OnboardingStatus.NOT_STARTED,
    emailVerifiedAt: null,
    notificationPreferences: {},
    policyAgreements: {},
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  } as User;
}

function setup(user: User) {
  const usersService = {
    findByEmail: jest.fn().mockResolvedValue(user),
    markEmailVerified: jest.fn().mockResolvedValue({
      ...user,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    }),
  };
  const sessionService = {
    issue: jest.fn().mockResolvedValue({
      sessionId: 'session-1',
      clientType: ClientType.MOBILE,
      refreshToken: 'refresh-token',
    }),
  };
  const tokenService = {
    signAccessToken: jest.fn().mockResolvedValue('access-token'),
    accessTokenTtlSeconds: 900,
  };
  const otpService = {
    consume: jest.fn().mockResolvedValue(undefined),
    assertNotOnCooldown: jest.fn().mockResolvedValue(undefined),
    issue: jest.fn().mockResolvedValue('123456'),
    ttlMinutesForCopy: 10,
  };
  const mailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(4) };
  const service = new AuthService(
    usersService as unknown as UsersService,
    sessionService as unknown as SessionService,
    tokenService as unknown as TokenService,
    otpService as unknown as OtpService,
    mailService as unknown as MailService,
    audit as unknown as AuditService,
    config as unknown as ConfigService<never, true>,
  );
  return { service, usersService, sessionService, otpService, mailService };
}

const verifyInput = {
  email: 'ada@purposemint.local',
  otp: '123456',
  clientType: ClientType.MOBILE,
};

describe('AuthService suspended accounts', () => {
  it('refuses email verification for a suspended account without activating it', async () => {
    const { service, usersService, sessionService, otpService } = setup(
      customer({ status: UserStatus.SUSPENDED }),
    );

    await expect(
      service.verifyEmail(verifyInput, context),
    ).rejects.toBeInstanceOf(ForbiddenException);
    // The code is checked first, so suspension is never an existence hint.
    expect(otpService.consume).toHaveBeenCalled();
    expect(usersService.markEmailVerified).not.toHaveBeenCalled();
    expect(sessionService.issue).not.toHaveBeenCalled();
  });

  it('still verifies a pending account and starts a session', async () => {
    const { service, usersService, sessionService } = setup(customer());

    const outcome = await service.verifyEmail(verifyInput, context);

    expect(usersService.markEmailVerified).toHaveBeenCalled();
    expect(sessionService.issue).toHaveBeenCalled();
    expect(outcome.auth.user.status).toBe(UserStatus.ACTIVE);
  });

  it('sends no new verification code to a suspended account', async () => {
    const { service, otpService, mailService } = setup(
      customer({ status: UserStatus.SUSPENDED }),
    );

    const response = await service.resendVerification({
      email: 'ada@purposemint.local',
    });

    expect(response.message).toMatch(/If that email still needs confirming/);
    expect(otpService.issue).not.toHaveBeenCalled();
    expect(mailService.sendVerificationEmail).not.toHaveBeenCalled();
  });
});
