import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { NotificationEmailWorker } from './notification-email-worker';
import { NotificationEmailSender } from './notification-email.sender';
import { NotificationEmailService } from './notification-email.service';

describe('automatic inactivity delivery worker', () => {
  function fixture() {
    const values: Record<string, unknown> = {
      NOTIFICATION_AUTOMATION_ENABLED: 'true',
      NOTIFICATION_CUSTOMER_APP_URL: 'https://app.purposemint.org',
    };
    const query = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 'job-1' }]),
    };
    const db = {
      getRepository: jest
        .fn()
        .mockReturnValue({ createQueryBuilder: () => query }),
    };
    const email = {
      sendAutomated: jest.fn().mockResolvedValue({ status: 'sent' }),
    };
    const sender = { ready: jest.fn().mockResolvedValue(true) };
    const worker = new NotificationEmailWorker(
      db as unknown as DataSource,
      email as unknown as NotificationEmailService,
      sender as unknown as NotificationEmailSender,
      { get: (key: string) => values[key] } as ConfigService,
    );
    return { worker, db, email, sender, query, values };
  }
  it('does nothing unless explicitly enabled with a valid link and SMTP', async () => {
    const f = fixture();
    f.values.NOTIFICATION_AUTOMATION_ENABLED = 'false';
    await f.worker.runBatch();
    expect(f.db.getRepository).not.toHaveBeenCalled();
    f.values.NOTIFICATION_AUTOMATION_ENABLED = 'true';
    f.sender.ready.mockResolvedValue(false);
    await f.worker.runBatch();
    expect(f.email.sendAutomated).not.toHaveBeenCalled();
  });
  it('selects only due optional inactivity emails with attempts remaining', async () => {
    const f = fixture();
    await f.worker.runBatch();
    expect(f.query.where).toHaveBeenCalledWith(
      expect.stringContaining('job.mandatory = false'),
      {
        event: 're_engagement',
        category: 'product_communications',
        channel: 'email',
      },
    );
    expect(f.query.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('job.attempts <'),
      expect.objectContaining({
        statuses: ['scheduled', 'blocked', 'retry_pending'],
        limit: 5,
      }),
    );
    expect(f.query.take).toHaveBeenCalledWith(25);
    expect(f.email.sendAutomated).toHaveBeenCalledWith(
      'job-1',
      'https://app.purposemint.org/',
    );
  });
  it('continues after one record fails without logging sensitive exception details', async () => {
    const f = fixture();
    f.query.getMany.mockResolvedValue([{ id: 'job-1' }, { id: 'job-2' }]);
    f.email.sendAutomated.mockRejectedValueOnce(
      new Error('secret-provider-details'),
    );
    await f.worker.runBatch();
    expect(f.email.sendAutomated).toHaveBeenCalledTimes(2);
  });
  it('does not overlap ticks and stops on shutdown', async () => {
    jest.useFakeTimers();
    const f = fixture();
    let finish!: () => void;
    const run = jest.spyOn(f.worker, 'runBatch').mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    f.worker.onApplicationBootstrap();
    await jest.advanceTimersByTimeAsync(120000);
    expect(run).toHaveBeenCalledTimes(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    await f.worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(120000);
    expect(run).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
  it('keyset-pages batches so blocked customers cannot starve later records', async () => {
    const f = fixture();
    f.query.getMany.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => ({ id: 'job-' + i })),
    );
    await f.worker.runBatch();
    f.query.getMany.mockResolvedValue([]);
    await f.worker.runBatch();
    expect(f.query.andWhere).toHaveBeenCalledWith('job.id > :cursor', {
      cursor: 'job-24',
    });
  });
});
