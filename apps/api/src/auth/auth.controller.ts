import type { UploadedImageFile } from "../common/types/uploaded-file.type";
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
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { registerSchema, loginSchema, verifyEmailSchema, resendOtpSchema, forgotPasswordSchema, verifyResetOtpSchema, resetPasswordSchema, resendResetOtpSchema } from "@muakhah/contracts";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("register")
  @UseInterceptors(
    FileInterceptor("profileImage", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async register(
    @Body() body: Record<string, string>,
    @UploadedFile() profileImage?: UploadedImageFile,
  ) {
    const parsed = registerSchema.safeParse({
      email: body.email,
      password: body.password,
      confirmPassword: body.confirmPassword,
      firstName: body.firstName,
      lastName: body.lastName,
      country: body.country,
      state: body.state,
      city: body.city,
      agreeTermsOfUse: body.agreeTermsOfUse,
      agreePrivacyPolicy: body.agreePrivacyPolicy,
      agreeDirectSponsorshipPolicy: body.agreeDirectSponsorshipPolicy,
      agreeCommunicationPolicy: body.agreeCommunicationPolicy,
    });

    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }

    if (profileImage && !profileImage.mimetype.startsWith("image/")) {
      throw new BadRequestException("Profile image must be an image file");
    }

    return this.authService.register(
      {
        email: parsed.data.email,
        password: parsed.data.password,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        country: parsed.data.country,
        state: parsed.data.state?.trim() || null,
        city: parsed.data.city?.trim() || null,
      },
      profileImage,
    );
  }

  @Post("verify-email")
  async verifyEmail(@Body() body: Record<string, string>) {
    const parsed = verifyEmailSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.verifyEmail(parsed.data.email, parsed.data.otp);
  }

  @Post("resend-otp")
  async resendOtp(@Body() body: Record<string, string>) {
    const parsed = resendOtpSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.resendOtp(parsed.data.email);
  }

  @Post("forgot-password")
  async forgotPassword(@Body() body: Record<string, string>) {
    const parsed = forgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.forgotPassword(parsed.data.email);
  }

  @Post("verify-reset-otp")
  async verifyResetOtp(@Body() body: Record<string, string>) {
    const parsed = verifyResetOtpSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.verifyResetOtp(parsed.data.email, parsed.data.otp);
  }

  @Post("reset-password")
  async resetPassword(@Body() body: Record<string, string>) {
    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.resetPassword(
      parsed.data.email,
      parsed.data.otp,
      parsed.data.newPassword,
    );
  }

  @Post("resend-reset-otp")
  async resendResetOtp(@Body() body: Record<string, string>) {
    const parsed = resendResetOtpSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.resendResetOtp(parsed.data.email);
  }

  @Post("login")
  async login(@Body() body: Record<string, string>) {
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.authService.login(parsed.data.email, parsed.data.password);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: { user: { sub: string } }) {
    const user = await this.authService.findById(req.user.sub);
    if (!user) {
      throw new BadRequestException("User not found");
    }
    return { user: this.authService.toPublicUser(user) };
  }
}
