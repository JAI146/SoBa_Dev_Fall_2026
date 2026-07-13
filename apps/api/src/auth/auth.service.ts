import type { UploadedImageFile } from '../common/types/uploaded-file.type';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'crypto';
import { Repository } from 'typeorm';
import {
  AdminRoleEnum,
  User,
  UserStatusEnum,
  UserTypeEnum,
} from '../entities/user.entity';
import { MailService } from '../mail/mail.service';
import { S3Service } from '../storage/s3.service';

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
    private readonly jwtService: JwtService,
    private readonly s3Service: S3Service,
    private readonly mailService: MailService,
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
      throw new ConflictException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const agreedAt = new Date().toISOString();
    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    const policyAgreements = {
      terms_of_use: agreedAt,
      privacy_policy: agreedAt,
    };

    let user: User;
    if (existing) {
      Object.assign(existing, {
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        country: data.country,
        state: data.state,
        city: data.city,
        policyAgreements,
        emailOtpHash: otpHash,
        emailOtpExpiresAt: otpExpiresAt,
      });
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
          policyAgreements,
          userType: UserTypeEnum.USER,
          status: UserStatusEnum.PENDING_EMAIL,
          profileImageUrl: null,
          emailOtpHash: otpHash,
          emailOtpExpiresAt: otpExpiresAt,
        }),
      );
    }

    if (profileImage) {
      try {
        user.profileImageUrl = await this.s3Service.uploadProfileImage(
          profileImage,
          user.id,
        );
        user = await this.userRepo.save(user);
      } catch {
        throw new BadRequestException(
          'Failed to upload profile image. Please try again.',
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
      throw new BadRequestException(
        'Failed to send verification email. Check SMTP settings or try again later.',
      );
    }

    return {
      requiresVerification: true as const,
      email: user.email,
      message: 'Verification code sent to your email.',
    };
  }

  async verifyEmail(email: string, otp: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.status !== UserStatusEnum.PENDING_EMAIL) {
      throw new BadRequestException('Invalid verification request');
    }
    await this.assertValidOtp(
      otp,
      user.emailOtpHash,
      user.emailOtpExpiresAt,
      'verification',
    );

    user.status = UserStatusEnum.ACTIVE;
    user.emailOtpHash = null;
    user.emailOtpExpiresAt = null;
    return this.buildAuthResponse(await this.userRepo.save(user));
  }

  async resendOtp(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.status !== UserStatusEnum.PENDING_EMAIL) {
      throw new BadRequestException(
        'No pending registration found for this email',
      );
    }

    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    user.emailOtpHash = otpHash;
    user.emailOtpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);
    await this.mailService.sendOtpEmail({
      to: user.email,
      firstName: user.firstName,
      otp,
    });
    return { success: true, message: 'A new verification code has been sent.' };
  }

  async forgotPassword(email: string) {
    const normalizedEmail = email.toLowerCase();
    const user = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });
    const response = {
      success: true as const,
      email: normalizedEmail,
      message:
        'If an account exists for this email, a password reset code has been sent.',
    };
    if (!user || user.status !== UserStatusEnum.ACTIVE) return response;

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
        'Failed to send password reset email. Check SMTP settings or try again later.',
      );
    }
    return response;
  }

  async verifyResetOtp(email: string, otp: string) {
    const user = await this.findResetUser(email);
    await this.assertValidOtp(
      otp,
      user.passwordResetOtpHash,
      user.passwordResetOtpExpiresAt,
      'password reset',
    );
    return { success: true, message: 'Reset code confirmed.' };
  }

  async resetPassword(email: string, otp: string, newPassword: string) {
    const user = await this.findResetUser(email);
    await this.assertValidOtp(
      otp,
      user.passwordResetOtpHash,
      user.passwordResetOtpExpiresAt,
      'password reset',
    );
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetOtpHash = null;
    user.passwordResetOtpExpiresAt = null;
    await this.userRepo.save(user);
    return { success: true, message: 'Your password has been updated.' };
  }

  async resendResetOtp(email: string) {
    const user = await this.findResetUser(email);
    if (!user.passwordResetOtpHash || !user.passwordResetOtpExpiresAt) {
      throw new BadRequestException('No password reset request found');
    }
    const { otp, otpHash, otpExpiresAt } = await this.createOtpPayload();
    user.passwordResetOtpHash = otpHash;
    user.passwordResetOtpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);
    await this.mailService.sendPasswordResetEmail({
      to: user.email,
      firstName: user.firstName,
      otp,
    });
    return {
      success: true,
      message: 'A new password reset code has been sent.',
    };
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === UserStatusEnum.PENDING_EMAIL) {
      throw new UnauthorizedException(
        'Please verify your email before signing in.',
      );
    }
    if (user.status === UserStatusEnum.SUSPENDED) {
      throw new UnauthorizedException('Account is suspended');
    }
    return this.buildAuthResponse(user);
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  toPublicUser(user: User) {
    const isAdmin = user.userType === UserTypeEnum.ADMIN;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      profileImageUrl: user.profileImageUrl,
      userType: user.userType,
      status: user.status,
      adminRole: isAdmin ? (user.adminRole ?? AdminRoleEnum.SUPER_ADMIN) : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async createOtpPayload() {
    const otp = String(randomInt(100000, 1000000));
    return {
      otp,
      otpHash: await bcrypt.hash(otp, 10),
      otpExpiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
    };
  }

  private async findResetUser(email: string) {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user || user.status !== UserStatusEnum.ACTIVE) {
      throw new BadRequestException('Invalid password reset request');
    }
    return user;
  }

  private async assertValidOtp(
    otp: string,
    hash: string | null,
    expiresAt: Date | null,
    label: string,
  ) {
    if (!hash || !expiresAt) {
      throw new BadRequestException('No ' + label + ' code found');
    }
    if (expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('The ' + label + ' code has expired');
    }
    if (!(await bcrypt.compare(otp, hash))) {
      throw new BadRequestException('Invalid ' + label + ' code');
    }
  }

  private buildAuthResponse(user: User) {
    const adminRole =
      user.userType === UserTypeEnum.ADMIN
        ? (user.adminRole ?? AdminRoleEnum.SUPER_ADMIN)
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
