import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationJob } from '../entities/notification-job.entity';
import { NotificationEmailService } from './notification-email.service';
import { NotificationEmailSender } from './notification-email.sender';
import { notificationAutomation } from './notification-automation-config';

@Injectable()
export class NotificationEmailWorker
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(NotificationEmailWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private current?: Promise<void>;
  private stopping = false;
  private cursor: string | null = null;
  constructor(
    @InjectDataSource() private readonly db: DataSource,
    private readonly email: NotificationEmailService,
    private readonly sender: NotificationEmailSender,
    private readonly config: ConfigService,
  ) {}
  onApplicationBootstrap() {
    // Do not send during module initialization; allow seeding/planning to finish.
    this.timer = setInterval(() => {
      void this.tick();
    }, 60000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    this.stopping = true;
    if (this.timer) clearInterval(this.timer);
    await this.current;
  }
  async tick() {
    if (this.current || this.stopping) return;
    this.current = this.runBatch().catch(() => {
      this.logger.error(
        'Automatic reminder batch failed. Check database access and notification configuration.',
      );
    });
    try {
      await this.current;
    } finally {
      this.current = undefined;
    }
  }
  async runBatch() {
    const settings = notificationAutomation(this.config);
    if (this.stopping || !settings.configured || !(await this.sender.ready()))
      return;
    const query = this.db
      .getRepository(NotificationJob)
      .createQueryBuilder('job')
      .where(
        'job.eventType = :event AND job.categoryKey = :category AND job.channel = :channel AND job.mandatory = false',
        {
          event: 're_engagement',
          category: 'product_communications',
          channel: 'email',
        },
      )
      .andWhere(
        'job.status IN (:...statuses) AND job.scheduledAt <= :now AND job.attempts < :limit',
        {
          statuses: ['scheduled', 'blocked', 'retry_pending'],
          now: new Date(),
          limit: 5,
        },
      )
      .orderBy('job.id', 'ASC')
      .take(settings.batchSize);
    if (this.cursor)
      query.andWhere('job.id > :cursor', { cursor: this.cursor });
    const jobs = await query.getMany();
    for (const job of jobs) {
      if (this.stopping || !notificationAutomation(this.config).configured)
        break;
      try {
        // Shared delivery service locks the customer and job, then rechecks all eligibility.
        await this.email.sendAutomated(job.id, settings.appUrl);
      } catch {
        // No message bodies, recipients, credentials, or raw provider errors in logs.
        this.logger.warn(
          'An automatic reminder was not sent; review notification activity and configuration.',
        );
      }
    }
    this.cursor = jobs.length === settings.batchSize ? jobs.at(-1)!.id : null;
  }
}
