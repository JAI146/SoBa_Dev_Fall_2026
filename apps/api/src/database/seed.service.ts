import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { S3Config } from "../entities/s3-config.entity";
import { SmtpConfig } from "../entities/smtp-config.entity";
import { User, UserStatusEnum, UserTypeEnum, AdminRoleEnum } from "../entities/user.entity";

const ADMIN_EMAIL = "admin@yopmail.com";
const ADMIN_PASSWORD = "Admin@147";

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
    const existing = await this.userRepo.findOne({
      where: { email: ADMIN_EMAIL },
    });
    if (existing) {
      if (!existing.adminRole) {
        existing.adminRole = AdminRoleEnum.SUPER_ADMIN;
        await this.userRepo.save(existing);
        this.logger.log(`Upgraded seeded admin to super_admin: ${ADMIN_EMAIL}`);
      }
      return;
    }
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const admin = this.userRepo.create({
      email: ADMIN_EMAIL,
      passwordHash,
      firstName: "System",
      lastName: "Admin",
      userType: UserTypeEnum.ADMIN,
      adminRole: AdminRoleEnum.SUPER_ADMIN,
      status: UserStatusEnum.ACTIVE,
      profileImageUrl: null,
    });
    await this.userRepo.save(admin);
    this.logger.log(`Seeded admin user: ${ADMIN_EMAIL}`);
  }

  private async seedS3Config() {
    const count = await this.s3ConfigRepo.count();
    if (count > 0) {
      return;
    }

    const accessKeyId = this.configService.get<string>("INITIAL_AWS_ACCESS_KEY_ID");
    const secretAccessKey = this.configService.get<string>("INITIAL_AWS_SECRET_ACCESS_KEY");
    const region = this.configService.get<string>("INITIAL_AWS_REGION");
    const bucket = this.configService.get<string>("INITIAL_AWS_S3_BUCKET");

    if (!accessKeyId || !secretAccessKey || !region || !bucket) {
      this.logger.warn(
        "No S3 config in database. Set INITIAL_AWS_* env vars or configure via admin Settings > Config > S3 Bucket.",
      );
      return;
    }

    const config = this.s3ConfigRepo.create({
      accessKeyId,
      secretAccessKey,
      region,
      bucket,
    });
    await this.s3ConfigRepo.save(config);
    this.logger.log("Seeded S3 configuration from INITIAL_AWS_* environment variables");
  }

  private async seedSmtpConfig() {
    const count = await this.smtpConfigRepo.count();
    if (count > 0) {
      return;
    }

    const smtpServer = this.configService.get<string>("INITIAL_SMTP_SERVER");
    const smtpPort = this.configService.get<string>("INITIAL_SMTP_PORT");
    const smtpEmailUser = this.configService.get<string>("INITIAL_SMTP_EMAIL_USER");
    const smtpEmailPassword = this.configService.get<string>(
      "INITIAL_SMTP_EMAIL_PASSWORD",
    );
    const smtpBcc = this.configService.get<string>("INITIAL_SMTP_BCC");
    const smtpEnabledRaw = this.configService.get<string>("INITIAL_SMTP_ENABLED");

    if (!smtpServer || !smtpPort || !smtpEmailUser || !smtpEmailPassword) {
      this.logger.warn(
        "No SMTP config in database. Set INITIAL_SMTP_* env vars or configure via admin Settings > Config > SMTP.",
      );
      return;
    }

    const config = this.smtpConfigRepo.create({
      smtpServer,
      smtpPort: parseInt(smtpPort, 10),
      smtpEmailUser,
      smtpEmailPassword,
      smtpBcc: smtpBcc?.replace(/^"|"$/g, "") || null,
      smtpEnabled: smtpEnabledRaw === "true" || smtpEnabledRaw === "1",
    });
    await this.smtpConfigRepo.save(config);
    this.logger.log("Seeded SMTP configuration from INITIAL_SMTP_* environment variables");
  }
}
