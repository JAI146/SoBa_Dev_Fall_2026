import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SmtpConfig } from '../entities/smtp-config.entity';

@Injectable()
export class SmtpConfigService {
  constructor(
    @InjectRepository(SmtpConfig)
    private readonly smtpConfigRepo: Repository<SmtpConfig>,
  ) {}

  async getConfig(): Promise<SmtpConfig | null> {
    return this.smtpConfigRepo.findOne({
      where: {},
      order: { updatedAt: 'DESC' },
    });
  }
}
