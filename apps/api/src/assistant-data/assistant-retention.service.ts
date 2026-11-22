import {
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { DataSource } from 'typeorm';

// Calendar months in UTC, applied to each saved prompt, answer, and chart together.
export const assistantRetentionCutoff =
  "(now() AT TIME ZONE 'UTC' - interval '2 months') AT TIME ZONE 'UTC'";

@Injectable()
export class AssistantRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(AssistantRetentionService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(private readonly db: DataSource) {}

  async onModuleInit() {
    await this.purgeExpired();
    this.timer = setInterval(() => void this.purgeExpired(), 60 * 60 * 1000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async purgeExpired() {
    if (this.running) return;
    this.running = true;
    try {
      await this.db.query(
        `DELETE FROM assistant_turns WHERE created_at < ${assistantRetentionCutoff}`,
      );
    } catch {
      this.logger.error(
        'Assistant transcript retention cleanup failed. It will retry in one hour.',
      );
    } finally {
      this.running = false;
    }
  }
}
