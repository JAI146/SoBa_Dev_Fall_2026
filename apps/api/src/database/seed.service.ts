import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { S3Config } from '../entities/s3-config.entity';
import { SmtpConfig } from '../entities/smtp-config.entity';
import {
  AdminRoleEnum,
  User,
  UserStatusEnum,
  UserTypeEnum,
} from '../entities/user.entity';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(S3Config)
    private readonly s3ConfigRepo: Repository<S3Config>,
    @InjectRepository(SmtpConfig)
    private readonly smtpConfigRepo: Repository<SmtpConfig>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
    await this.seedS3Config();
    await this.seedSmtpConfig();
  }

  private async seedAdmin() {
    const email = this.configService
      .get<string>('INITIAL_ADMIN_EMAIL')
      ?.toLowerCase();
    const password = this.configService.get<string>('INITIAL_ADMIN_PASSWORD');
    if (!email && !password) return;
    if (!email || !password) {
      this.logger.warn(
        'Both INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required to seed an admin.',
      );
      return;
    }

    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      existing.userType = UserTypeEnum.ADMIN;
      existing.adminRole = AdminRoleEnum.SUPER_ADMIN;
      existing.status = UserStatusEnum.ACTIVE;
      await this.userRepo.save(existing);
      return;
    }

    await this.userRepo.save(
      this.userRepo.create({
        email,
        passwordHash: await bcrypt.hash(password, 12),
        firstName: 'System',
        lastName: 'Admin',
        userType: UserTypeEnum.ADMIN,
        adminRole: AdminRoleEnum.SUPER_ADMIN,
        status: UserStatusEnum.ACTIVE,
        profileImageUrl: null,
      }),
    );
    this.logger.log('Seeded configured admin account.');
  }

  private async seedS3Config() {
    if ((await this.s3ConfigRepo.count()) > 0) return;
    const accessKeyId = this.configService.get<string>(
      'INITIAL_AWS_ACCESS_KEY_ID',
    );
    const secretAccessKey = this.configService.get<string>(
      'INITIAL_AWS_SECRET_ACCESS_KEY',
    );
    const region = this.configService.get<string>('INITIAL_AWS_REGION');
    const bucket = this.configService.get<string>('INITIAL_AWS_S3_BUCKET');
    if (!accessKeyId || !secretAccessKey || !region || !bucket) return;

    await this.s3ConfigRepo.save(
      this.s3ConfigRepo.create({
        accessKeyId,
        secretAccessKey,
        region,
        bucket,
      }),
    );
    this.logger.log('Seeded S3 configuration from environment variables.');
  }

  private async seedSmtpConfig() {
    if ((await this.smtpConfigRepo.count()) > 0) return;
    const smtpServer = this.configService.get<string>('INITIAL_SMTP_SERVER');
    const smtpPort = this.configService.get<string>('INITIAL_SMTP_PORT');
    const smtpEmailUser = this.configService.get<string>(
      'INITIAL_SMTP_EMAIL_USER',
    );
    const smtpEmailPassword = this.configService.get<string>(
      'INITIAL_SMTP_EMAIL_PASSWORD',
    );
    if (!smtpServer || !smtpPort || !smtpEmailUser || !smtpEmailPassword)
      return;

    await this.smtpConfigRepo.save(
      this.smtpConfigRepo.create({
        smtpServer,
        smtpPort: Number(smtpPort),
        smtpEmailUser,
        smtpEmailPassword,
        smtpBcc: this.configService.get<string>('INITIAL_SMTP_BCC') || null,
        smtpEnabled:
          this.configService.get<string>('INITIAL_SMTP_ENABLED') === 'true',
      }),
    );
    this.logger.log('Seeded SMTP configuration from environment variables.');
  }
}
