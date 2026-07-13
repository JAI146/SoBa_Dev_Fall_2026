import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UseGuards,
} from "@nestjs/common";
import { s3ConfigSchema, smtpConfigSchema, AdminPermission } from "@muakhah/contracts";
import { AdminGuard } from "../auth/admin.guard";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/require-permissions.decorator";
import { SmtpConfigService } from "../mail/smtp-config.service";
import { S3Service } from "../storage/s3.service";

@Controller("admin/settings")
@UseGuards(JwtAuthGuard, AdminGuard, PermissionsGuard)
@RequirePermissions(AdminPermission.SETTINGS_MANAGE)
export class AdminSettingsController {
  constructor(
    private readonly s3Service: S3Service,
    private readonly smtpConfigService: SmtpConfigService,
  ) {}

  @Get("s3")
  async getS3Config() {
    const config = await this.s3Service.getConfig();
    if (!config) {
      return { config: null };
    }
    return {
      config: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        bucket: config.bucket,
        updatedAt: config.updatedAt.toISOString(),
      },
    };
  }

  @Put("s3")
  async updateS3Config(@Body() body: Record<string, string>) {
    const parsed = s3ConfigSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    const saved = await this.s3Service.saveConfig(parsed.data);
    return {
      config: {
        accessKeyId: saved.accessKeyId,
        secretAccessKey: saved.secretAccessKey,
        region: saved.region,
        bucket: saved.bucket,
        updatedAt: saved.updatedAt.toISOString(),
      },
    };
  }

  @Get("smtp")
  async getSmtpConfig() {
    const config = await this.smtpConfigService.getConfig();
    if (!config) {
      return { config: null };
    }
    return { config: this.smtpConfigService.toPublic(config) };
  }

  @Put("smtp")
  async updateSmtpConfig(@Body() body: Record<string, unknown>) {
    const parsed = smtpConfigSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.message).join(", ");
      throw new BadRequestException(message);
    }
    const saved = await this.smtpConfigService.saveConfig({
      smtpServer: parsed.data.smtpServer,
      smtpPort: parsed.data.smtpPort,
      smtpEmailUser: parsed.data.smtpEmailUser,
      smtpEmailPassword: parsed.data.smtpEmailPassword,
      smtpBcc: parsed.data.smtpBcc?.trim() || null,
      smtpEnabled: parsed.data.smtpEnabled,
    });
    return { config: this.smtpConfigService.toPublic(saved) };
  }
}
