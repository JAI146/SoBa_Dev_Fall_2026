import type { UploadedImageFile } from "../common/types/uploaded-file.type";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { randomInt } from "crypto";
import { LegalDocumentSlug, ActivityAction, permissionsForRole } from "@muakhah/contracts";
import { Repository } from "typeorm";
import { ActivityLogService } from "../activity-logs/activity-log.service";
import { AdminRoleEnum, User, UserStatusEnum, UserTypeEnum } from "../entities/user.entity";
import { Family, FamilyProfileStatusEnum } from "../entities/family.entity";
import { MailService } from "../mail/mail.service";
import { S3Service } from "../storage/s3.service";

export interface JwtPayload {
  sub: string;
  email: string;
  userType: UserTypeEnum;
  adminRole?: AdminRoleEnum | null;
}

const OTP_EXPIRES_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Family)
    private readonly familyRepo: Repository<Family>,
    private readonly jwtService: JwtService,
    private readonly s3Service: S3Service,
    private readonly mailService: MailService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async register(
    data: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      country: string;
      state: string | null;
      city: string | null;
    },
    profileImage?: UploadedImageFile,
  ) {
    const email = data.email.toLowerCase();
    const existing = await this.userRepo.findOne({ where: { email } });

    if (existing && existing.status !== UserStatusEnum.PENDING_EMAIL) {
      throw new ConflictException("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const agreedAt = new Date().toISOString();
    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();

    let user: User;
    if (existing) {
      existing.passwordHash = passwordHash;
      existing.firstName = data.firstName;
      existing.lastName = data.lastName;
      existing.country = data.country;
      existing.state = data.state;
      existing.city = data.city;
      existing.policyAgreements = {
        [LegalDocumentSlug.TERMS_OF_USE]: agreedAt,
        [LegalDocumentSlug.PRIVACY_POLICY]: agreedAt,
        [LegalDocumentSlug.DIRECT_SPONSORSHIP_POLICY]: agreedAt,
        [LegalDocumentSlug.COMMUNICATION_POLICY]: agreedAt,
      };
      existing.emailOtpHash = otpHash;
      existing.emailOtpExpiresAt = otpExpiresAt;
      user = await this.userRepo.save(existing);
    } else {
      user = await this.userRepo.save(
        this.userRepo.create({
          email,
          passwordHash,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          state: data.state,
          city: data.city,
          policyAgreements: {
            [LegalDocumentSlug.TERMS_OF_USE]: agreedAt,
            [LegalDocumentSlug.PRIVACY_POLICY]: agreedAt,
            [LegalDocumentSlug.DIRECT_SPONSORSHIP_POLICY]: agreedAt,
            [LegalDocumentSlug.COMMUNICATION_POLICY]: agreedAt,
          },
          userType: UserTypeEnum.VISITOR,
          status: UserStatusEnum.PENDING_EMAIL,
          profileImageUrl: null,
          emailOtpHash: otpHash,
          emailOtpExpiresAt: otpExpiresAt,
        }),
      );
    }

    if (profileImage) {
      try {
        const imageUrl = await this.s3Service.uploadProfileImage(
          profileImage,
          user.id,
        );
        user.profileImageUrl = imageUrl;
        user = await this.userRepo.save(user);
      } catch {
        await this.userRepo.delete({ id: user.id });
        throw new BadRequestException(
          "Failed to upload profile image. Please try again.",
        );
      }
    }

    try {
      await this.mailService.sendOtpEmail({
        to: user.email,
        firstName: user.firstName,
        otp,
      });
    } catch {
      await this.userRepo.delete({ id: user.id });
      throw new BadRequestException(
        "Failed to send verification email. Check SMTP settings or try again later.",
      );
    }

    return {
      requiresVerification: true as const,
      email: user.email,
      message: "Verification code sent to your email.",
    };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.status !== UserStatusEnum.PENDING_EMAIL) {
      throw new BadRequestException("Invalid verification request");
    }

    if (!user.emailOtpHash || !user.emailOtpExpiresAt) {
      throw new BadRequestException("No verification code found. Request a new one.");
    }

    if (user.emailOtpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Verification code has expired. Request a new one.");
    }

    const valid = await bcrypt.compare(otp, user.emailOtpHash);
    if (!valid) {
      throw new BadRequestException("Invalid verification code");
    }

    user.status = UserStatusEnum.ACTIVE;
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    const saved = await this.userRepo.save(user);

    return this.buildAuthResponse(saved);
  }

  async resendOtp(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.status !== UserStatusEnum.PENDING_EMAIL) {
      throw new BadRequestException("No pending registration found for this email");
    }

    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    user.emailOtpHash = otpHash;
    user.emailOtpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);

    try {
      await this.mailService.sendOtpEmail({
        to: user.email,
        firstName: user.firstName,
        otp,
      });
    } catch {
      throw new BadRequestException(
        "Failed to send verification email. Check SMTP settings or try again later.",
      );
    }

    return {
      success: true,
      message: "A new verification code has been sent to your email.",
    };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });

    const genericResponse = {
      success: true as const,
      email: normalizedEmail,
      message:
        "If an account exists for this email, a password reset code has been sent.",
    };

    if (!user || !this.canResetPassword(user)) {
      return genericResponse;
    }

    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        otp,
      });
    } catch {
      user.passwordResetOtpHash = null;
      user.passwordResetOtpExpiresAt = null;
      await this.userRepo.save(user);
      throw new BadRequestException(
        "Failed to send password reset email. Check SMTP settings or try again later.",
      );
    }

    return genericResponse;
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || !this.canResetPassword(user)) {
      throw new BadRequestException("Invalid password reset request");
    }

    await this.assertValidResetOtp(user, otp);

    return {
      success: true as const,
      message: "Verification code confirmed. You can set a new password.",
    };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || !this.canResetPassword(user)) {
      throw new BadRequestException("Invalid password reset request");
    }

    await this.assertValidResetOtp(user, otp);

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await this.userRepo.save(user);

    return {
      success: true as const,
      message: "Your password has been updated. You can sign in with your new password.",
    };
  }

  async resendResetOtp(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepo.findOne({ where: { email: normalizedEmail } });
    if (!user || !this.canResetPassword(user)) {
      throw new BadRequestException("No password reset request found for this email");
    }

    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      throw new BadRequestException("No password reset request found for this email");
    }

    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        firstName: user.firstName,
        otp,
      });
    } catch {
      throw new BadRequestException(
        "Failed to send password reset email. Check SMTP settings or try again later.",
      );
    }

    return {
      success: true,
      message: "A new password reset code has been sent to your email.",
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("Invalid email or password");
    }

    if (user.status === UserStatusEnum.PENDING_EMAIL) {
      throw new UnauthorizedException(
        "Please verify your email before signing in.",
      );
    }

    if (user.status === UserStatusEnum.SUSPENDED) {
      throw new UnauthorizedException("Account is suspended");
    }

    if (user.userType === UserTypeEnum.FAMILY) {
      const family = await this.familyRepo.findOne({
        where: { familyUserId: user.id },
      });
      if (
        !family ||
        !family.familyLoginEnabled ||
        family.profileStatus === FamilyProfileStatusEnum.SUSPENDED
      ) {
        throw new UnauthorizedException("Account is suspended");
      }
    }

    const response = this.buildAuthResponse(user);

    if (user.userType === UserTypeEnum.ADMIN) {
      await this.activityLogService.log({
        actorUserId: user.id,
        actorAdminRole: user.adminRole,
        action: ActivityAction.USER_LOGIN,
        entityType: "user",
        entityId: user.id,
        summary: `Admin login: ${user.email}`,
      });
    }

    return response;
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  toPublicUser(user: User) {
    const adminRole =
      user.userType === UserTypeEnum.ADMIN
        ? user.adminRole ?? AdminRoleEnum.SUPER_ADMIN
        : null;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      userType: user.userType,
      status: user.status,
      adminRole,
      permissions:
        user.userType === UserTypeEnum.ADMIN
          ? permissionsForRole(adminRole)
          : undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async createOtpPayload() {
    const otp = String(randomInt(100000, 1000000));
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000);
    return { otp, otpHash, otpExpiresAt };
  }

  private canResetPassword(user: User) {
    if (user.status !== UserStatusEnum.ACTIVE) {
      return false;
    }

    return (
      user.userType === UserTypeEnum.FAMILY ||
      user.userType === UserTypeEnum.VISITOR ||
      user.userType === UserTypeEnum.SPONSOR
    );
  }

  private async assertValidResetOtp(user: User, otp: string) {
    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      throw new BadRequestException("No password reset code found. Request a new one.");
    }

    if (user.passwordResetOtpExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Password reset code has expired. Request a new one.");
    }

    const valid = await bcrypt.compare(otp, user.passwordResetOtpHash);
    if (!valid) {
      throw new BadRequestException("Invalid password reset code");
    }
  }

  private buildAuthResponse(user: User) {
    const adminRole =
      user.userType === UserTypeEnum.ADMIN
        ? user.adminRole ?? AdminRoleEnum.SUPER_ADMIN
        : null;
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      userType: user.userType,
      adminRole,
    };
    return {
      user: this.toPublicUser(user),
      accessToken: this.jwtService.sign(payload),
    };
  }
}
