import type { User } from '../entities/user.entity';
import type { NotificationJob } from '../entities/notification-job.entity';
export const INACTIVITY_MS = 72 * 60 * 60 * 1000;
export const REENGAGEMENT_MIN_INTERVAL_HOURS = 168;
export function inactivityBaseline(
  user: Pick<User, 'lastLoginAt' | 'createdAt'>,
) {
  return user.lastLoginAt ?? user.createdAt;
}
export function reengagementKey(
  user: Pick<User, 'id' | 'lastLoginAt' | 'createdAt'>,
  channel: 'push' | 'email',
) {
  return `re_engagement:${user.id}:${inactivityBaseline(user).toISOString()}:${channel}`;
}
export function isCurrentReengagement(
  job: Pick<NotificationJob, 'eventType' | 'idempotencyKey' | 'channel'>,
  user: Pick<User, 'id' | 'lastLoginAt' | 'createdAt'>,
  now: Date,
) {
  return (
    job.eventType !== 're_engagement' ||
    (now.getTime() - inactivityBaseline(user).getTime() >= INACTIVITY_MS &&
      job.idempotencyKey === reengagementKey(user, job.channel))
  );
}
