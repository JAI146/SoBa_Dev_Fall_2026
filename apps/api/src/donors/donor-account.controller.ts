import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import {
  updateDonorAccountSchema,
  updateDonorNotificationPreferencesSchema,
  updateDonorPasswordSchema,
} from "@muakhah/contracts";
import { DonorGuard } from "../auth/donor.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { DonorAccountService } from "./donor-account.service";

@Controller("donor/account")
@UseGuards(JwtAuthGuard, DonorGuard)
export class DonorAccountController {
  constructor(private readonly donorAccountService: DonorAccountService) {}

  @Get()
  getSettings(@Req() req: { user: { sub: string } }) {
    return this.donorAccountService.getSettingsForDonor(req.user.sub);
  }

  @Patch()
  updateProfile(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateDonorAccountSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.donorAccountService.updateProfileForDonor(
      req.user.sub,
      parsed.data,
    );
  }

  @Patch("profile-image")
  @UseInterceptors(
    FileInterceptor("profileImage", {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  updateProfileImage(
    @Req() req: { user: { sub: string } },
    @UploadedFile() profileImage?: UploadedImageFile,
  ) {
    if (!profileImage) {
      throw new BadRequestException("Profile image is required");
    }
    if (!profileImage.mimetype.startsWith("image/")) {
      throw new BadRequestException("Profile image must be an image file");
    }
    return this.donorAccountService.updateProfileImageForDonor(
      req.user.sub,
      profileImage,
    );
  }

  @Patch("password")
  updatePassword(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateDonorPasswordSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.donorAccountService.updatePasswordForDonor(
      req.user.sub,
      parsed.data,
    );
  }

  @Patch("notifications")
  updateNotifications(
    @Req() req: { user: { sub: string } },
    @Body() body: Record<string, unknown>,
  ) {
    const parsed = updateDonorNotificationPreferencesSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    return this.donorAccountService.updateNotificationPreferencesForDonor(
      req.user.sub,
      parsed.data,
    );
  }

  @Post("delete-request")
  requestDeleteAccount(@Req() req: { user: { sub: string } }) {
    return this.donorAccountService.requestDeleteAccountForDonor(req.user.sub);
  }
}
