import type { UploadedImageFile } from '../common/types/uploaded-file.type';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

function required(body: Record<string, string>, field: string) {
  const value = body[field]?.trim();
  if (!value) throw new BadRequestException(field + ' is required');
  return value;
}

function email(body: Record<string, string>) {
  const value = required(body, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    throw new BadRequestException('Enter a valid email address');
  }
  return value;
}

function otp(body: Record<string, string>) {
  const value = required(body, 'otp');
  if (!/^\d{6}$/.test(value)) {
    throw new BadRequestException('OTP must contain six digits');
  }
  return value;
}

function password(body: Record<string, string>, field = 'password') {
  const value = required(body, field);
  if (value.length < 8) {
    throw new BadRequestException(
      'Password must contain at least 8 characters',
    );
  }
  return value;
}

function agreed(value: string | undefined) {
  return value === 'on' || value === 'true' || value === '1';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('profileImage', { limits: { fileSize: 5_242_880 } }),
  )
  async register(
    @Body() body: Record<string, string>,
    @UploadedFile() profileImage?: UploadedImageFile,
  ) {
    const parsedPassword = password(body);
    if (parsedPassword !== required(body, 'confirmPassword')) {
      throw new BadRequestException('Passwords do not match');
    }
    if (!agreed(body.agreeTermsOfUse) || !agreed(body.agreePrivacyPolicy)) {
      throw new BadRequestException(
        'Terms of Use and Privacy Policy are required',
      );
    }
    if (profileImage && !profileImage.mimetype.startsWith('image/')) {
      throw new BadRequestException('Profile image must be an image file');
    }

    return this.authService.register(
      {
        email: email(body),
        password: parsedPassword,
        firstName: required(body, 'firstName'),
        lastName: required(body, 'lastName'),
        country: required(body, 'country'),
        state: body.state?.trim() || null,
        city: body.city?.trim() || null,
      },
      profileImage,
    );
  }

  @Post('verify-email')
  verifyEmail(@Body() body: Record<string, string>) {
    return this.authService.verifyEmail(email(body), otp(body));
  }

  @Post('resend-otp')
  resendOtp(@Body() body: Record<string, string>) {
    return this.authService.resendOtp(email(body));
  }

  @Post('forgot-password')
  forgotPassword(@Body() body: Record<string, string>) {
    return this.authService.forgotPassword(email(body));
  }

  @Post('verify-reset-otp')
  verifyResetOtp(@Body() body: Record<string, string>) {
    return this.authService.verifyResetOtp(email(body), otp(body));
  }

  @Post('reset-password')
  resetPassword(@Body() body: Record<string, string>) {
    return this.authService.resetPassword(
      email(body),
      otp(body),
      password(body, 'newPassword'),
    );
  }

  @Post('resend-reset-otp')
  resendResetOtp(@Body() body: Record<string, string>) {
    return this.authService.resendResetOtp(email(body));
  }

  @Post('login')
  login(@Body() body: Record<string, string>) {
    return this.authService.login(email(body), required(body, 'password'));
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() request: { user: { sub: string } }) {
    const user = await this.authService.findById(request.user.sub);
    if (!user) throw new BadRequestException('User not found');
    return { user: this.authService.toPublicUser(user) };
  }
}
