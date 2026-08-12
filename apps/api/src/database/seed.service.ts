import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdminRole,
  DEFAULT_NOTIFICATION_PREFERENCES,
  UserStatus,
  UserType,
} from '@purposemint/contracts';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import type { Env } from '../config/env.validation';
import { S3Config } from '../entities/s3-config.entity';
import { SmtpConfig } from '../entities/smtp-config.entity';
import { User } from '../entities/user.entity';

/**
 * Optional bootstrapping from environment variables. Everything here is a
 * no-op unless the matching variables are set, so a fresh checkout starts
 * clean. This creates no schema — migrations do that.
 */
@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(S3Config)
    private readonly s3ConfigRepo: Repository<S3Config>,
    @InjectRepository(SmtpConfig)
    private readonly smtpConfigRepo: Repository<SmtpConfig>,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedS3Config();
    await this.seedSmtpConfig();
  }

  private async seedAdmin() {
    const email = this.config
      .get('INITIAL_ADMIN_EMAIL', { infer: true })
      ?.trim()
      .toLowerCase();
    const password = this.config.get('INITIAL_ADMIN_PASSWORD', { infer: true });
    if (!email && !password) return;
    if (!email || !password) {
      this.logger.warn(
        'Set both INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to seed an admin.',
      );
      return;
    }

    const rounds = this.config.get('BCRYPT_ROUNDS', { infer: true });
    const existing = await this.usersRepo.findOne({ where: { email } });

    if (existing) {
      Object.assign(existing, {
        userType: UserType.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
      });
      await this.usersRepo.save(existing);
      return;
    }

    await this.usersRepo.save(
      this.usersRepo.create({
        email,
        passwordHash: await bcrypt.hash(password, rounds),
        firstName: 'System',
        lastName: 'Admin',
        userType: UserType.ADMIN,
        adminRole: AdminRole.SUPER_ADMIN,
        // A seeded admin has no inbox to confirm from.
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        policyAgreements: {},
        profileImageUrl: null,
      }),
    );
    this.logger.log('Seeded the configured admin account.');
  }

  private async seedS3Config() {
    if ((await this.s3ConfigRepo.count()) > 0) return;

    const accessKeyId = this.config.get('INITIAL_AWS_ACCESS_KEY_ID', {
      infer: true,
    });
    const secretAccessKey = this.config.get('INITIAL_AWS_SECRET_ACCESS_KEY', {
      infer: true,
    });
    const region = this.config.get('INITIAL_AWS_REGION', { infer: true });
    const bucket = this.config.get('INITIAL_AWS_S3_BUCKET', { infer: true });
    if (!accessKeyId || !secretAccessKey || !region || !bucket) return;

    await this.s3ConfigRepo.save(
      this.s3ConfigRepo.create({
        accessKeyId,
        secretAccessKey,
        region,
        bucket,
      }),
    );
    this.logger.log('Seeded S3 configuration from the environment.');
  }

  private async seedSmtpConfig() {
    if ((await this.smtpConfigRepo.count()) > 0) return;

    const smtpServer = this.config.get('INITIAL_SMTP_SERVER', { infer: true });
    const smtpPort = this.config.get('INITIAL_SMTP_PORT', { infer: true });
    const smtpEmailUser = this.config.get('INITIAL_SMTP_EMAIL_USER', {
      infer: true,
    });
    const smtpEmailPassword = this.config.get('INITIAL_SMTP_EMAIL_PASSWORD', {
      infer: true,
    });
    if (!smtpServer || !smtpPort || !smtpEmailUser || !smtpEmailPassword) {
      return;
    }

    await this.smtpConfigRepo.save(
      this.smtpConfigRepo.create({
        smtpServer,
        smtpPort: Number(smtpPort),
        smtpEmailUser,
        smtpEmailPassword,
        smtpBcc:
          this.config.get('INITIAL_SMTP_BCC', { infer: true })?.trim() || null,
        smtpEnabled: this.config.get('INITIAL_SMTP_ENABLED', { infer: true }),
      }),
    );
    this.logger.log('Seeded SMTP configuration from the environment.');
  }
}
