import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import type {
  DonorAccountSettings,
  DonorNotificationPreferences,
  UpdateDonorAccountInput,
  UpdateDonorNotificationPreferencesInput,
  UpdateDonorPasswordInput,
} from "@muakhah/contracts";
import { defaultDonorNotificationPreferences } from "@muakhah/contracts";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import {
  User,
  UserTypeEnum,
} from "../entities/user.entity";
import { S3Service } from "../storage/s3.service";

function isDonorUser(user: User): boolean {
  return (
    user.userType === UserTypeEnum.VISITOR ||
    user.userType === UserTypeEnum.SPONSOR
  );
}

function normalizeNotificationPreferences(
  value: Record<string, boolean> | null | undefined,
): DonorNotificationPreferences {
  return {
    sponsorshipUpdates:
      value?.sponsorshipUpdates ??
      defaultDonorNotificationPreferences.sponsorshipUpdates,
    messageAlerts:
      value?.messageAlerts ?? defaultDonorNotificationPreferences.messageAlerts,
    adminNotices:
      value?.adminNotices ?? defaultDonorNotificationPreferences.adminNotices,
  };
}

@Injectable()
export class DonorAccountService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly s3Service: S3Service,
  ) {}

  async getSettingsForDonor(userId: string): Promise<{ settings: DonorAccountSettings }> {
    const user = await this.loadDonorOrThrow(userId);
    return { settings: this.toSettings(user) };
  }

  async updateProfileForDonor(
    userId: string,
    input: UpdateDonorAccountInput,
  ): Promise<{ settings: DonorAccountSettings }> {
    const user = await this.loadDonorOrThrow(userId);
    user.firstName = input.firstName.trim();
    user.lastName = input.lastName.trim();
    user.country = input.country.trim();
    user.city = input.city?.trim() || null;
    const saved = await this.userRepo.save(user);
    return { settings: this.toSettings(saved) };
  }

  async updateProfileImageForDonor(
    userId: string,
    profileImage: UploadedImageFile,
  ): Promise<{ settings: DonorAccountSettings }> {
    const user = await this.loadDonorOrThrow(userId);

    try {
      const imageUrl = await this.s3Service.uploadProfileImage(
        profileImage,
        user.id,
      );
      user.profileImageUrl = imageUrl;
      const saved = await this.userRepo.save(user);
      return { settings: this.toSettings(saved) };
    } catch {
      throw new BadRequestException(
        "Failed to upload profile image. Please try again.",
      );
    }
  }

  async updatePasswordForDonor(
    userId: string,
    input: UpdateDonorPasswordInput,
  ): Promise<{ success: true }> {
    const user = await this.loadDonorOrThrow(userId);
    const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Current password is incorrect");
    }

    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await this.userRepo.save(user);
    return { success: true };
  }

  async updateNotificationPreferencesForDonor(
    userId: string,
    input: UpdateDonorNotificationPreferencesInput,
  ): Promise<{ settings: DonorAccountSettings }> {
    const user = await this.loadDonorOrThrow(userId);
    user.notificationPreferences = {
      sponsorshipUpdates: input.sponsorshipUpdates,
      messageAlerts: input.messageAlerts,
      adminNotices: input.adminNotices,
    };
    const saved = await this.userRepo.save(user);
    return { settings: this.toSettings(saved) };
  }

  async requestDeleteAccountForDonor(
    userId: string,
  ): Promise<{ settings: DonorAccountSettings }> {
    const user = await this.loadDonorOrThrow(userId);
    if (user.deleteAccountRequestedAt) {
      throw new BadRequestException("Delete account request already submitted");
    }
    user.deleteAccountRequestedAt = new Date();
    const saved = await this.userRepo.save(user);
    return { settings: this.toSettings(saved) };
  }

  private async loadDonorOrThrow(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user || !isDonorUser(user)) {
      throw new NotFoundException("Donor account not found");
    }
    return user;
  }

  private toSettings(user: User): DonorAccountSettings {
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      country: user.country,
      city: user.city,
      notificationPreferences: normalizeNotificationPreferences(
        user.notificationPreferences,
      ),
      deleteAccountRequested: user.deleteAccountRequestedAt !== null,
    };
  }
}
