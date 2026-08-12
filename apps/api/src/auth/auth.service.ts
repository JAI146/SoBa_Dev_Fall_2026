import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditAction,
  AuditOutcome,
  ClientType,
  OtpType,
  PolicyDocumentKey,
  UserStatus,
  type AuthResponse,
  type ChangePasswordInput,
  type ClientTypeValue,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type PolicyAgreements,
  type RegisterInput,
  type ResendVerificationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@purposemint/contracts';
import * as bcrypt from 'bcrypt';
import { toPublicUser } from '../common/mappers/user.mapper';
import type { RequestContext } from '../common/request-context';
import { AuditService } from '../audit/audit.service';
import type { Env } from '../config/env.validation';
import type { User } from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import type { AuthPrincipal } from './auth-principal';
import { OtpService } from './otp.service';
import {
  SessionRevokedReason,
  SessionService,
  type IssuedSession,
} from './session.service';
import { TokenService } from './token.service';

/** Nothing about a login failure should hint at which half was wrong. */
const GENERIC_LOGIN_FAILURE =
  "That email and password don't match up. You can reset your password if you need to.";

const GENERIC_SESSION_FAILURE =
  'That session has run out. Signing in again will get you straight back to where you were.';

/**
 * What every session-creating call hands back.
 *
 * `auth` is the response body: it carries the refresh token only for mobile
 * clients. `session` still holds the plaintext token so the controller can put
 * a dashboard client's copy into an httpOnly cookie instead.
 */
export interface AuthOutcome {
  auth: AuthResponse;
  session: IssuedSession;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds: number;
  /**
   * Compared against when the email is unknown, so a miss costs the same time
   * as a wrong password and the response cannot be timed to reveal existence.
   */
  private readonly dummyPasswordHash: string;

  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly tokenService: TokenService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly audit: AuditService,
    config: ConfigService<Env, true>,
  ) {
    this.bcryptRounds = config.get('BCRYPT_ROUNDS', { infer: true });
    this.dummyPasswordHash = bcrypt.hashSync(
      'purposemint-timing-equaliser',
      this.bcryptRounds,
    );
  }

  // --- registration and verification -----------------------------------

  async register(
    input: RegisterInput,
    context: RequestContext,
  ): Promise<AuthOutcome> {
    const agreedAt = new Date().toISOString();
    const policyAgreements: PolicyAgreements = {
      [PolicyDocumentKey.TERMS_OF_USE]: {
        version: input.policyVersion,
        agreedAt,
      },
      [PolicyDocumentKey.PRIVACY_POLICY]: {
        version: input.policyVersion,
        agreedAt,
      },
    };

    const existing = await this.usersService.findByEmail(input.email);
    const user =
      existing && existing.status === UserStatus.PENDING_EMAIL
        ? // A half-finished signup is not a dead end — let them start over.
          await this.usersService.save(
            Object.assign(existing, {
              passwordHash: await this.hashPassword(input.password),
              firstName: input.firstName,
              lastName: input.lastName,
              country: input.country ?? null,
              state: input.state ?? null,
              city: input.city ?? null,
              policyAgreements,
            }),
          )
        : await this.usersService.create({
            email: input.email,
            passwordHash: await this.hashPassword(input.password),
            firstName: input.firstName,
            lastName: input.lastName,
            country: input.country ?? null,
            state: input.state ?? null,
            city: input.city ?? null,
            policyAgreements,
          });

    await this.issueAndSendVerificationCode(user);

    await this.audit.record({
      action: AuditAction.USER_REGISTERED,
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
    });

    return this.startSession(user, input.clientType, context);
  }

  async verifyEmail(
    input: VerifyEmailInput,
    context: RequestContext,
  ): Promise<AuthOutcome> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) {
      // Same message the OTP service gives for a bad code — no existence hint.
      throw this.unknownCode();
    }
    if (user.emailVerifiedAt) {
      // Never hand out a session here. A confirmed address has no outstanding
      // code, so anything presented is unverified — signing in is the way back.
      throw new ConflictException(
        "That email is already confirmed — you're all set to sign in.",
      );
    }

    await this.otpService.consume(
      user.id,
      OtpType.EMAIL_VERIFICATION,
      input.otp,
    );
    const verified = await this.usersService.markEmailVerified(user.id);

    await this.audit.record({
      action: AuditAction.USER_EMAIL_VERIFIED,
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
    });

    return this.startSession(verified, input.clientType, context);
  }

  async resendVerification(
    input: ResendVerificationInput,
  ): Promise<MessageResponse> {
    const confirmation: MessageResponse = {
      message:
        "If that email still needs confirming, a new code is on its way. It works for the next few minutes.",
    };

    const user = await this.usersService.findByEmail(input.email);
    if (!user || user.emailVerifiedAt) return confirmation;

    await this.otpService.assertNotOnCooldown(
      user.id,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.issueAndSendVerificationCode(user);
    return confirmation;
  }

  // --- sessions ---------------------------------------------------------

  async login(
    input: LoginInput,
    context: RequestContext,
  ): Promise<AuthOutcome> {
    const user = await this.usersService.findByEmailWithPassword(input.email);

    // Run the compare either way so both branches cost the same.
    const passwordMatches = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? this.dummyPasswordHash,
    );

    if (!user || !passwordMatches) {
      await this.audit.record({
        action: AuditAction.USER_LOGIN_FAILED,
        outcome: AuditOutcome.FAILURE,
        actorUserId: user?.id ?? null,
        entityType: 'user',
        entityId: user?.id ?? null,
        ipAddress: context.ipAddress,
        metadata: { email: UsersService.normaliseEmail(input.email) },
      });
      throw new UnauthorizedException(GENERIC_LOGIN_FAILURE);
    }

    // Only mentioned once the password is known to be right, so suspension
    // cannot be used to probe for registered addresses.
    if (user.status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        "This account is on hold at the moment. Email support@purposemint.app and we'll help you sort it out.",
      );
    }

    await this.usersService.markLoggedIn(user.id);

    await this.audit.record({
      action: AuditAction.USER_LOGIN_SUCCEEDED,
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
      metadata: { clientType: input.clientType },
    });

    return this.startSession(user, input.clientType, context);
  }

  /** Rotation and reuse detection both live in `SessionService`. */
  async refresh(
    presentedToken: string | undefined,
    context: RequestContext,
  ): Promise<AuthOutcome> {
    if (!presentedToken) {
      throw new UnauthorizedException(GENERIC_SESSION_FAILURE);
    }

    const rotated = await this.sessionService.rotate(presentedToken, context);
    const user = await this.usersService.findById(rotated.userId);
    if (!user || user.status === UserStatus.SUSPENDED) {
      await this.sessionService.revokeSession(
        rotated.sessionId,
        SessionRevokedReason.LOGOUT_ALL,
      );
      throw new UnauthorizedException(GENERIC_SESSION_FAILURE);
    }

    return this.buildOutcome(user, rotated);
  }

  async logout(principal: AuthPrincipal): Promise<MessageResponse> {
    await this.sessionService.revokeSession(
      principal.sessionId,
      SessionRevokedReason.LOGOUT,
    );
    return { message: "You're signed out on this device. See you soon." };
  }

  async logoutAll(
    principal: AuthPrincipal,
    context: RequestContext,
  ): Promise<MessageResponse> {
    await this.sessionService.revokeAllForUser(
      principal.userId,
      SessionRevokedReason.LOGOUT_ALL,
    );
    await this.audit.record({
      action: AuditAction.USER_LOGGED_OUT_ALL,
      actorUserId: principal.userId,
      entityType: 'user',
      entityId: principal.userId,
      ipAddress: context.ipAddress,
    });
    return {
      message: "You're signed out everywhere. Every device will need a fresh sign-in.",
    };
  }

  // --- passwords --------------------------------------------------------

  /** Always answers the same way, whether or not the address is registered. */
  async forgotPassword(input: ForgotPasswordInput): Promise<MessageResponse> {
    const confirmation: MessageResponse = {
      message:
        'If there’s an account for that email, a reset code is on its way.',
    };

    const user = await this.usersService.findByEmail(input.email);
    if (!user || user.status === UserStatus.SUSPENDED) return confirmation;

    try {
      await this.otpService.assertNotOnCooldown(
        user.id,
        OtpType.PASSWORD_RESET,
      );
    } catch {
      // Told to slow down? Still answer identically — the cooldown is ours to
      // enforce quietly, not a signal to hand back.
      return confirmation;
    }

    const code = await this.otpService.issue(user.id, OtpType.PASSWORD_RESET);
    await this.sendCode(user, code, 'password-reset');
    return confirmation;
  }

  async resetPassword(
    input: ResetPasswordInput,
    context: RequestContext,
  ): Promise<MessageResponse> {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) throw this.unknownCode();

    await this.otpService.consume(user.id, OtpType.PASSWORD_RESET, input.otp);
    await this.usersService.updatePasswordHash(
      user.id,
      await this.hashPassword(input.newPassword),
    );
    // A reset is the recovery path for a compromised account — clear the decks.
    await this.sessionService.revokeAllForUser(
      user.id,
      SessionRevokedReason.PASSWORD_RESET,
    );

    await this.audit.record({
      action: AuditAction.USER_PASSWORD_RESET,
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
    });

    return {
      message:
        "Your new password is set. Sign in with it and you're back where you left off.",
    };
  }

  async changePassword(
    principal: AuthPrincipal,
    input: ChangePasswordInput,
    context: RequestContext,
  ): Promise<MessageResponse> {
    const user = await this.usersService.findByIdWithPassword(
      principal.userId,
    );
    if (!user) throw new UnauthorizedException(GENERIC_LOGIN_FAILURE);

    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash))) {
      throw new UnauthorizedException(
        "That current password doesn't match what we have. You can reset it instead if it's slipped your mind.",
      );
    }

    await this.usersService.updatePasswordHash(
      user.id,
      await this.hashPassword(input.newPassword),
    );
    // Everything except the device doing the changing.
    await this.sessionService.revokeAllForUser(
      user.id,
      SessionRevokedReason.PASSWORD_CHANGED,
      principal.sessionId,
    );

    await this.audit.record({
      action: AuditAction.USER_PASSWORD_CHANGED,
      actorUserId: user.id,
      entityType: 'user',
      entityId: user.id,
      ipAddress: context.ipAddress,
    });

    return {
      message:
        "Your password is updated. You're still signed in here; other devices will need the new one.",
    };
  }

  // --- helpers ----------------------------------------------------------

  private hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.bcryptRounds);
  }

  private async issueAndSendVerificationCode(user: User): Promise<void> {
    const code = await this.otpService.issue(
      user.id,
      OtpType.EMAIL_VERIFICATION,
    );
    await this.sendCode(user, code, 'verification');
  }

  private async sendCode(
    user: User,
    code: string,
    kind: 'verification' | 'password-reset',
  ): Promise<void> {
    const params = {
      to: user.email,
      firstName: user.firstName,
      otp: code,
      expiresMinutes: this.otpService.ttlMinutesForCopy,
    };

    try {
      if (kind === 'verification') {
        await this.mailService.sendVerificationEmail(params);
      } else {
        await this.mailService.sendPasswordResetEmail(params);
      }
    } catch (error) {
      // The code itself never reaches the log.
      this.logger.error(
        `Could not send the ${kind} email to user ${user.id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        "We couldn't get that email out just now. Give it a moment and ask for a new code.",
      );
    }
  }

  private async startSession(
    user: User,
    clientType: ClientTypeValue,
    context: RequestContext,
  ): Promise<AuthOutcome> {
    const session = await this.sessionService.issue({
      userId: user.id,
      clientType,
      context,
    });
    return this.buildOutcome(user, session);
  }

  private async buildOutcome(
    user: User,
    session: IssuedSession,
  ): Promise<AuthOutcome> {
    const accessToken = await this.tokenService.signAccessToken({
      sub: user.id,
      sid: session.sessionId,
      userType: user.userType,
      adminRole: user.adminRole,
    });

    return {
      auth: {
        user: toPublicUser(user),
        accessToken,
        expiresIn: this.tokenService.accessTokenTtlSeconds,
        // Mobile stores this in expo-secure-store. Dashboard clients get the
        // same token as an httpOnly cookie, set by the controller.
        ...(session.clientType === ClientType.MOBILE
          ? { refreshToken: session.refreshToken }
          : {}),
      },
      session,
    };
  }

  private unknownCode() {
    return new UnauthorizedException(
      "That code doesn't match the one we sent. Worth another look — or ask for a new one.",
    );
  }
}
