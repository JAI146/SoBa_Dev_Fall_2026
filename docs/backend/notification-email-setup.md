# Notification email setup

Notifications now lives at **Settings → Notifications** (`/dashboard/settings/notifications`). The old `/dashboard/notifications` link redirects there. Other feature pages and shared styling are unchanged.

## Configure and test

1. Apply this patch on your existing feature branch, then run `docker compose up --build -d`. No new dependencies, database reset, or migrations are required by this patch.
2. Sign in with a staff account that has `settings.full`. Open **Settings → Notifications → Email setup**.
3. Enter your email provider's SMTP server, port, username, password, and approved sender address. Enter credentials locally; never paste them into chat or commit them. Port 587 uses STARTTLS; 465 uses implicit TLS. Other ports also require STARTTLS.
4. Enable sending and save. A blank password preserves the stored password. This reuses the application's shared SMTP account, including the sender used for account emails; coordinate changes with your email administrator.
5. Enter a real inbox in **Test inbox** and click **Send test email**. Check both inbox and spam. Saving settings alone does not verify delivery.

## Send a customer email

1. Click **Create notification**, select a real customer, an optional category, and Email, then save.
2. In **Activity**, click **Send email**. Review the recipient, write the subject and message, confirm, and send.
3. **Sent** means the SMTP server accepted it. **Delivered** requires a provider receipt and is not claimed by this integration.

Demo customers at `@purposemint.local` cannot receive email. Use an active customer with a genuinely verified real address and enabled category preferences. Do not change seeded email addresses to bypass verification.

The API enforces notification-edit permission, customer consent, quiet hours, scheduled time, category frequency limits, and a maximum of five send attempts. Re-engagement also checks that the customer is still inactive and applies a minimum seven-day interval. Future scheduling sets the earliest manual send time; no automatic email dispatcher is included.

Messages are plain text and are not saved in audit metadata or job records. The legacy shared SMTP BCC is deliberately not copied onto notification emails. Credentials are never returned by these dashboard endpoints; storage uses the existing server-side SMTP configuration. Protect database access and its backups.

An interrupted or uncertain delivery is blocked from automatic resending. Investigate with your SMTP provider before taking further action. Do not reset `processing` or `delivery_uncertain` records blindly.

## Remaining integrations

- Push delivery still needs a provider and registered device tokens. Mobile files are outside this patch.
- Automated dispatch and delivery/bounce webhook handling are not implemented.
- Mandatory security, transaction, and critical-update messages belong to their own workflows, not the optional staff composer.
- Live KiroMoney integration is unchanged.

## Validation

Contracts build, API/dashboard type checks, dashboard lint/build, notification tests, database integration using PostgreSQL-compatible PGlite, and mocked browser interaction are checked during preparation. SMTP acceptance, rejection, uncertain delivery, consent, frequency limits, and duplicate prevention are covered without sending real email. Actual provider/inbox delivery must be tested locally with your own configuration.

The earlier notification-operations guide describes the initial provider-blocked implementation. This document supersedes that limitation for manually sent optional emails only.
