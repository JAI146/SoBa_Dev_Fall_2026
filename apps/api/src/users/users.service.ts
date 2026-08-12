import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AuditAction,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserStatus,
  UserType,
  type PolicyAgreements,
  type ProfileImageUploadResponse,
  type RecordPolicyAgreementInput,
  type UpdateNotificationPreferencesInput,
  type UpdateProfileInput,
  type UserPublic,
} from '@purposemint/contracts';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import { toPublicUser } from '../common/mappers/user.mapper';
import type { RequestContext } from '../common/request-context';
import { User } from '../entities/user.entity';
import { S3Service } from '../storage/s3.service';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  country: string | null;
  state: string | null;
  city: string | null;
  policyAgreements: PolicyAgreements;
}

/**
 * Owns every read and write of the `users` table. `AuthService` depends on this
 * service; this service never depends on `AuthService`.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly s3Service: S3Service,
    private readonly audit: AuditService,
  ) {}

  /** Emails are stored lowercased and trimmed, so every lookup normalises too. */
  static normaliseEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({
      where: { email: UsersService.normaliseEmail(email) },
    });
  }

  /** `passwordHash` is `select: false`, so credential paths ask for it by name. */
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', {
        email: UsersService.normaliseEmail(email),
      })
      .getOne();
  }

  findById(id: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    return this.usersRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :id', { id })
      .getOne();
  }

  async getByIdOrFail(id: string): Promise<User> {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException("We couldn't find that account.");
    }
    return user;
  }

  async create(input: CreateUserInput): Promise<User> {
    const email = UsersService.normaliseEmail(input.email);
    if (await this.usersRepo.exists({ where: { email } })) {
      throw new ConflictException(
        "There's already an account with that email. Signing in — or resetting your password — will get you back in.",
      );
    }

    return this.usersRepo.save(
      this.usersRepo.create({
        ...input,
        email,
        userType: UserType.CUSTOMER,
        status: UserStatus.PENDING_EMAIL,
        notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        profileImageUrl: null,
      }),
    );
  }

  save(user: User): Promise<User> {
    return this.usersRepo.save(user);
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepo.update(userId, { passwordHash });
  }

  async markLoggedIn(userId: string): Promise<void> {
    await this.usersRepo.update(userId, { lastLoginAt: new Date() });
  }

  async markEmailVerified(userId: string): Promise<User> {
    await this.usersRepo.update(userId, {
      emailVerifiedAt: new Date(),
      status: UserStatus.ACTIVE,
    });
    return this.getByIdOrFail(userId);
  }

  // --- /api/users/me ---------------------------------------------------

  async getProfile(userId: string): Promise<UserPublic> {
    return toPublicUser(await this.getByIdOrFail(userId));
  }

  async updateProfile(
    userId: string,
    input: UpdateProfileInput,
  ): Promise<UserPublic> {
    const user = await this.getByIdOrFail(userId);
    // Only the keys the caller actually sent — `undefined` must not blank a field.
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined) {
        Object.assign(user, { [key]: value });
      }
    }
    return toPublicUser(await this.usersRepo.save(user));
  }

  async updateNotificationPreferences(
    userId: string,
    input: UpdateNotificationPreferencesInput,
  ): Promise<UserPublic> {
    const user = await this.getByIdOrFail(userId);
    user.notificationPreferences = {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...user.notificationPreferences,
      ...input,
    };
    return toPublicUser(await this.usersRepo.save(user));
  }

  async recordPolicyAgreement(
    userId: string,
    input: RecordPolicyAgreementInput,
  ): Promise<UserPublic> {
    const user = await this.getByIdOrFail(userId);
    user.policyAgreements = {
      ...user.policyAgreements,
      [input.documentKey]: {
        version: input.version,
        // Stamped here, never taken from the client.
        agreedAt: new Date().toISOString(),
      },
    };
    return toPublicUser(await this.usersRepo.save(user));
  }

  async createProfileImageUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<ProfileImageUploadResponse> {
    await this.getByIdOrFail(userId);
    try {
      return await this.s3Service.createProfileImageUploadUrl(
        userId,
        contentType,
      );
    } catch {
      throw new BadRequestException(
        "We couldn't set up the image upload just now. Try again in a moment.",
      );
    }
  }

  async requestDeletion(
    userId: string,
    context: RequestContext,
  ): Promise<{ deleteAccountRequestedAt: string; message: string }> {
    const user = await this.getByIdOrFail(userId);
    user.deleteAccountRequestedAt ??= new Date();
    const saved = await this.usersRepo.save(user);

    await this.audit.record({
      action: AuditAction.USER_DELETION_REQUESTED,
      actorUserId: userId,
      entityType: 'user',
      entityId: userId,
      ipAddress: context.ipAddress,
    });

    return {
      deleteAccountRequestedAt:
        saved.deleteAccountRequestedAt!.toISOString(),
      message:
        "We've noted your request. Your account stays as it is until we finish it, and you can cancel any time before then.",
    };
  }

  async cancelDeletion(
    userId: string,
    context: RequestContext,
  ): Promise<{ deleteAccountRequestedAt: null; message: string }> {
    const user = await this.getByIdOrFail(userId);
    user.deleteAccountRequestedAt = null;
    await this.usersRepo.save(user);

    await this.audit.record({
      action: AuditAction.USER_DELETION_CANCELLED,
      actorUserId: userId,
      entityType: 'user',
      entityId: userId,
      ipAddress: context.ipAddress,
    });

    return {
      deleteAccountRequestedAt: null,
      message: "Good to have you staying. Nothing has changed on your account.",
    };
  }
}
