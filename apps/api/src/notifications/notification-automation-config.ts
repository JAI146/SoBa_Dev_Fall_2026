import { customerAppUrl } from './notification-email-template';

export function notificationAutomation(config: { get(key: string): unknown }) {
  const enabled =
    config.get('NOTIFICATION_AUTOMATION_ENABLED') === 'true' ||
    config.get('NOTIFICATION_AUTOMATION_ENABLED') === true;
  const rawUrl = config.get('NOTIFICATION_CUSTOMER_APP_URL');
  const appUrl =
    typeof rawUrl === 'string'
      ? customerAppUrl(rawUrl, config.get('NODE_ENV') === 'production')
      : null;
  // Mobile/customer app wiring is optional. A supplied but unsafe URL blocks delivery.
  const linkValid = rawUrl === undefined || rawUrl === '' || Boolean(appUrl);
  return {
    enabled,
    appUrl,
    configured: enabled && linkValid,
    batchSize: 25,
    intervalSeconds: 60,
  };
}
