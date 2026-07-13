import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SmtpConfig } from "../entities/smtp-config.entity";

@Injectable()
export class SmtpConfigService {
  constructor(
    @InjectRepository(SmtpConfig)
    private readonly smtpConfigRepo: Repository<SmtpConfig>,
  ) {}

  async getConfig(): Promise<SmtpConfig | null> {
    const configs = await this.smtpConfigRepo.find({
      order: { updatedAt: "DESC" },
      take: 1,
    });
    return configs[0] ?? null;
  }

  async saveConfig(data: {
    smtpServer: string;
    smtpPort: number;
    smtpEmailUser: string;
    smtpEmailPassword: string;
    smtpBcc: string | null;
    smtpEnabled: boolean;
  }): Promise<SmtpConfig> {
    const existing = await this.getConfig();
    if (existing) {
      existing.smtpServer = data.smtpServer;
      existing.smtpPort = data.smtpPort;
      existing.smtpEmailUser = data.smtpEmailUser;
      existing.smtpEmailPassword = data.smtpEmailPassword;
      existing.smtpBcc = data.smtpBcc;
      existing.smtpEnabled = data.smtpEnabled;
      return this.smtpConfigRepo.save(existing);
    }
    const config = this.smtpConfigRepo.create(data);
    return this.smtpConfigRepo.save(config);
  }

  toPublic(config: SmtpConfig) {
    return {
      smtpServer: config.smtpServer,
      smtpPort: config.smtpPort,
      smtpEmailUser: config.smtpEmailUser,
      smtpEmailPassword: config.smtpEmailPassword,
      smtpBcc: config.smtpBcc,
      smtpEnabled: config.smtpEnabled,
      updatedAt: config.updatedAt.toISOString(),
    };
  }
}
