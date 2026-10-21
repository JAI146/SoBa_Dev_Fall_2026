import { notificationEmailDraft } from '@purposemint/contracts';
import {
  customerAppUrl,
  formattedNotificationEmail,
  reengagementEmail,
} from './notification-email-template';
import { notificationAutomation } from './notification-automation-config';

describe('inactivity email content and configuration', () => {
  it('generates branded HTML, an accessible link, plain text, and preference guidance', () => {
    const email = reengagementEmail('Jordan', 'https://app.purposemint.org/');
    expect(email.subject).toBe('Your next small step with PurposeMint');
    expect(email.text).toContain('Hi Jordan,');
    expect(email.html).toContain('Open PurposeMint');
    expect(email.html).toContain('href="https://app.purposemint.org/"');
    expect(email.text).toContain('Notification Management');
    expect(email.html).not.toContain('<img');
    expect(email.text).toContain('no pressure');
  });
  it('escapes customer-controlled content instead of accepting HTML', () => {
    const email = reengagementEmail(
      '<img src=x onerror=alert(1)> & "',
      'https://app.purposemint.org/',
    );
    expect(email.html).not.toContain('<img');
    expect(email.html).toContain('&lt;img');
    expect(email.html).toContain('&amp;');
    expect(
      reengagementEmail(null, 'https://app.purposemint.org/').text,
    ).toContain('Hi there,');
  });
  it.each([
    'javascript:alert(1)',
    'https://user:password@site.com',
    'https://site.com/?token=secret',
    'https://site.com/#secret',
    'http://app.site.com',
  ])('rejects unsafe customer app URLs: %s', (url) => {
    expect(customerAppUrl(url)).toBeNull();
  });
  it('allows local HTTP only outside production', () => {
    expect(customerAppUrl('http://localhost:8081')).toBe(
      'http://localhost:8081/',
    );
    expect(customerAppUrl('http://localhost:8081', true)).toBeNull();
  });
  it('still provides formatted content without mobile link integration', () => {
    const email = reengagementEmail('Jordan', null);
    expect(email.html).not.toContain('href=');
    expect(email.html).toContain('Open your PurposeMint app');
    expect(email.text).not.toContain('null');
  });
  it('requires explicit enablement and a validated destination', () => {
    const get = (values: Record<string, unknown>) => ({
      get: (key: string) => values[key],
    });
    expect(notificationAutomation(get({})).configured).toBe(false);
    expect(
      notificationAutomation(
        get({
          NOTIFICATION_AUTOMATION_ENABLED: 'false',
          NOTIFICATION_CUSTOMER_APP_URL: 'https://app.site.com',
        }),
      ).configured,
    ).toBe(false);
    expect(
      notificationAutomation(get({ NOTIFICATION_AUTOMATION_ENABLED: 'true' }))
        .configured,
    ).toBe(true);
    expect(
      notificationAutomation(
        get({
          NOTIFICATION_AUTOMATION_ENABLED: 'true',
          NOTIFICATION_CUSTOMER_APP_URL: 'javascript:alert(1)',
        }),
      ).configured,
    ).toBe(false);
    expect(
      notificationAutomation(
        get({
          NOTIFICATION_AUTOMATION_ENABLED: 'true',
          NOTIFICATION_CUSTOMER_APP_URL: 'https://app.site.com',
        }),
      ).configured,
    ).toBe(true);
  });
});

describe('staff notification email content', () => {
  it.each([
    ['goals', 'A small step toward your goal'],
    ['habits', 'Your PurposeMint habit check-in'],
    ['weekly_savings', 'Your weekly PurposeMint savings check-in'],
    ['other', 'A check-in from PurposeMint'],
  ])(
    'provides editable, personalized content for %s',
    (categoryKey, subject) => {
      const draft = notificationEmailDraft({
        categoryKey,
        eventType: 'staff_notification',
        recipientName: 'Jordan',
      });
      expect(draft.subject).toBe(subject);
      expect(draft.message).toContain('Hi Jordan,');
      expect(draft.message).toContain('Notification Management');
      expect(draft.message).not.toMatch(/\$|<html/);
    },
  );
  it('prioritizes the inactivity event and handles a missing name', () => {
    const draft = notificationEmailDraft({
      categoryKey: 'other',
      eventType: 're_engagement',
      recipientName: null,
    });
    expect(draft.subject).toBe('Your next small step with PurposeMint');
    expect(draft.message).toContain('Hi there,');
    expect(draft.message).toContain('no pressure');
  });
  it('renders staff text as escaped paragraphs without executing markup', () => {
    const html = formattedNotificationEmail(
      '<script>alert(1)</script>',
      'Hi <img src=x>,\n\nYour next step & progress.',
    );
    expect(html).toContain('PurposeMint');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&lt;img');
    expect(html).toContain('step &amp; progress.');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html.match(/<p style=/g)).toHaveLength(2);
  });
});
