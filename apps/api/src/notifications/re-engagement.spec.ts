import { queueNotificationSchema } from '@purposemint/contracts';
import {
  INACTIVITY_MS,
  isCurrentReengagement,
  reengagementKey,
} from './re-engagement-policy';
import { ReEngagementPlanner } from './re-engagement-planner.service';
import { DataSource } from 'typeorm';
import { AuditService } from '../audit/audit.service';
const baseline = new Date('2026-10-01T12:00:00Z');
const user = {
  id: '00000000-0000-4000-8000-000000000001',
  lastLoginAt: baseline,
  createdAt: new Date('2026-09-01T12:00:00Z'),
};
const job = {
  eventType: 're_engagement',
  channel: 'push' as const,
  idempotencyKey: reengagementKey(user, 'push'),
};
describe('14.3 re-engagement policy', () => {
  it('qualifies at exactly 72 hours, excluding earlier times', () => {
    expect(
      isCurrentReengagement(
        job,
        user,
        new Date(baseline.getTime() + INACTIVITY_MS - 1),
      ),
    ).toBe(false);
    expect(
      isCurrentReengagement(
        job,
        user,
        new Date(baseline.getTime() + INACTIVITY_MS),
      ),
    ).toBe(true);
  });
  it('invalidates old reminders after another login, even once inactivity returns', () => {
    const returned = { ...user, lastLoginAt: new Date('2026-10-02T12:00:00Z') };
    expect(
      isCurrentReengagement(job, returned, new Date('2026-10-10T12:00:00Z')),
    ).toBe(false);
  });
  it('uses creation time for a verified account that has never logged in', () => {
    expect(reengagementKey({ ...user, lastLoginAt: null }, 'email')).toContain(
      '2026-09-01T12:00:00.000Z:email',
    );
  });
  it('does not apply inactivity rules to mandatory or other ordinary jobs', () => {
    expect(
      isCurrentReengagement(
        { ...job, eventType: 'security.alert' },
        user,
        baseline,
      ),
    ).toBe(true);
  });
  it('reserves automatic re-engagement events from manual queue creation', () => {
    expect(
      queueNotificationSchema.safeParse({
        userId: user.id,
        requestId: user.id,
        categoryKey: 'security',
        eventType: 're_engagement',
        channel: 'push',
      }).success,
    ).toBe(false);
  });
  it('runs on startup, repeats without overlap, and stops on shutdown', async () => {
    jest.useFakeTimers();
    const planner = new ReEngagementPlanner(
      {} as DataSource,
      {} as AuditService,
    );
    let finish!: () => void;
    const pending = new Promise<
      Awaited<ReturnType<ReEngagementPlanner['planBatch']>>
    >((resolve) => {
      finish = () =>
        resolve({
          queued: 0,
          cancelled: 0,
          suppressed: 0,
          examined: 0,
          busy: false,
          deliveryAvailable: false,
        });
    });
    const scan = jest.spyOn(planner, 'planBatch').mockReturnValue(pending);
    planner.onApplicationBootstrap();
    expect(scan).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(120000);
    expect(scan).toHaveBeenCalledTimes(1);
    finish();
    await Promise.resolve();
    await Promise.resolve();
    await jest.advanceTimersByTimeAsync(60000);
    expect(scan).toHaveBeenCalledTimes(2);
    planner.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(120000);
    expect(scan).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
