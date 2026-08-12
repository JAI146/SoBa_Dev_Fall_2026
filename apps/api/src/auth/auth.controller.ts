import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  ClientType,
  type AuthResponse,
  type MessageResponse,
} from '@purposemint/contracts';
import type { Request, Response } from 'express';
import { AuthThrottlerGuard } from '../common/guards/auth-throttler.guard';
import { requestContext } from '../common/request-context';
import type { Env } from '../config/env.validation';
import type { AuthPrincipal } from './auth-principal';
import { AuthService, type AuthOutcome } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RefreshDto,
  RegisterDto,
  ResendVerificationDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';
import {
  REFRESH_COOKIE_NAME,
  clearRefreshCookie,
  setRefreshCookie,
} from './refresh-cookie';

/**
 * Tighter than the global limit, on the routes worth guessing at. The
 * `AuthThrottlerGuard` registered on each of them counts per IP *and* email.
 */
const CREDENTIAL_LIMIT = { default: { limit: 8, ttl: 60_000 } };
const EMAIL_SEND_LIMIT = { default: { limit: 4, ttl: 300_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    config: ConfigService<Env, true>,
  ) {
    this.isProduction = config.get('NODE_ENV', { infer: true }) === 'production';
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(CREDENTIAL_LIMIT)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create an account, send a confirmation code, and sign them in',
  })
  async register(
    @Body() body: RegisterDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.deliver(
      response,
      await this.authService.register(body, requestContext(request)),
    );
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(CREDENTIAL_LIMIT)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm an email address with its one-time code' })
  async verifyEmail(
    @Body() body: VerifyEmailDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.deliver(
      response,
      await this.authService.verifyEmail(body, requestContext(request)),
    );
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(EMAIL_SEND_LIMIT)
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a fresh confirmation code' })
  resendVerification(
    @Body() body: ResendVerificationDto,
  ): Promise<MessageResponse> {
    return this.authService.resendVerification(body);
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(CREDENTIAL_LIMIT)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign in and open a session' })
  async login(
    @Body() body: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return this.deliver(
      response,
      await this.authService.login(body, requestContext(request)),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Exchange a refresh token for a new access token and rotate it',
  })
  async refresh(
    @Body() body: RefreshDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    // Mobile sends it in the body; the dashboard's arrives as a cookie.
    const presented = body.refreshToken ?? this.cookieToken(request);
    return this.deliver(
      response,
      await this.authService.refresh(presented, requestContext(request)),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End the session on this device only' })
  async logout(
    @CurrentUser() principal: AuthPrincipal,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.logout(principal);
    clearRefreshCookie(response, this.isProduction);
    return result;
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End every session for this account' })
  async logoutAll(
    @CurrentUser() principal: AuthPrincipal,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.logoutAll(
      principal,
      requestContext(request),
    );
    clearRefreshCookie(response, this.isProduction);
    return result;
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(EMAIL_SEND_LIMIT)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a password reset code. Always answers the same way.',
  })
  forgotPassword(@Body() body: ForgotPasswordDto): Promise<MessageResponse> {
    return this.authService.forgotPassword(body);
  }

  @Public()
  @UseGuards(AuthThrottlerGuard)
  @Throttle(CREDENTIAL_LIMIT)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password with a reset code and end every session',
  })
  async resetPassword(
    @Body() body: ResetPasswordDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<MessageResponse> {
    const result = await this.authService.resetPassword(
      body,
      requestContext(request),
    );
    clearRefreshCookie(response, this.isProduction);
    return result;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Change a password from inside the app and sign out other devices',
  })
  changePassword(
    @CurrentUser() principal: AuthPrincipal,
    @Body() body: ChangePasswordDto,
    @Req() request: Request,
  ): Promise<MessageResponse> {
    return this.authService.changePassword(
      principal,
      body,
      requestContext(request),
    );
  }

  /**
   * The one place refresh tokens are handed out. Dashboard clients get an
   * httpOnly cookie; mobile clients already have theirs in the body.
   */
  private deliver(response: Response, outcome: AuthOutcome): AuthResponse {
    if (outcome.session.clientType === ClientType.DASHBOARD) {
      setRefreshCookie(response, outcome.session, this.isProduction);
    }
    return outcome.auth;
  }

  private cookieToken(request: Request): string | undefined {
    const cookies = request.cookies as
      | Record<string, string | undefined>
      | undefined;
    return cookies?.[REFRESH_COOKIE_NAME];
  }
}
