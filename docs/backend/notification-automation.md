# Automatic inactivity email

## Scope and safety defaults

This change only extends the notification feature. It does not change mobile,
staff roles, other dashboard features, existing shared Compose settings,
authentication, database schema, or the lockfile. No migration is required.

Automatic delivery is **off by default**, including when existing SMTP is enabled.
The existing manual composer and SMTP connection test remain available.

## What actually runs

- The existing planner checks eligible customers in batches of 100, once per minute.
- Verified, active customers inactive for at least 72 hours may get an optional
  email under Other Optional Communications. Explicit category settings and
  existing productUpdates preferences are respected; this patch does not opt in anyone.
- One reminder per channel per inactivity spell, with at least seven days between
  re-engagement reminders. A longer category interval also applies.
- A separate delivery worker checks once per minute and processes at most 25 due
  email records sequentially per API instance. There is no overlapping local batch.
  Keyset paging prevents an undeliverable first batch from starving later records.
- Only optional re_engagement emails in product_communications are automatic.
  Goal/habit/staff/mandatory notification records are not automatically dispatched.
- Immediately before claiming a message, the delivery service locks the customer
  then job and rechecks current preferences, category, account verification/status,
  quiet hours, schedule, frequency, inactivity spell, and duplicate-send state.
- A returning customer's old reminder is cancelled. Quiet hours postpone delivery.
  Opt-outs and demo addresses suppress sending. No attempt is consumed by a deferral.
- Known temporary SMTP rejections and pre-connection DNS/connect failures retry
  after 5, 10, 20, and 40 minutes (five attempts maximum).
- Authentication/permanent rejections remain failed for staff review. Timeouts,
  lost responses, and ambiguous submission outcomes remain delivery_uncertain;
  they are never automatically retried.
- A process crash after claiming leaves processing for review, deliberately not
  automatically reclaimed because SMTP cannot guarantee exactly-once delivery.
- Audit intent is recorded before SMTP. Send results use a system actor. Bodies,
  credentials, customer names and raw provider exceptions are not stored in audit
  metadata/logs by the worker.
- SMTP acceptance records sent, never delivered. Delivery/bounce receipts still
  require a provider webhook integration.

## Email content

Subject: Your next small step with PurposeMint

The HTML email has a PurposeMint header, a personalized greeting, a supportive
check-in, preference guidance, and a plain-text fallback. It contains no financial
amounts, private reflections, remote images, or tracking pixels.

A valid customer app URL adds an Open PurposeMint button. Without mobile/customer
link integration, the formatted email still sends and asks the customer to open
their app. No broken or staff-dashboard link is inserted.

Only HTTPS links are accepted, except localhost HTTP outside production.
Credentials, query strings and fragments are prohibited in the configured link.
An invalid non-empty link blocks automatic delivery until corrected/removed.

## Enable locally after review

1. Apply the patch and rebuild contracts.
2. Configure SMTP under Settings > Notifications > Email setup.
3. Send a connection test to Mailtrap Sandbox first.
4. Use a controlled active, email-verified test customer with an address you own,
   optional email consent enabled for Other Optional Communications, and a last
   login at least 72 hours ago. Do not change real customers' login dates/consent.
5. Explicitly enable only your local API:

```bash
NOTIFICATION_AUTOMATION_ENABLED=true docker compose -f compose.yaml -f docs/backend/notification-automation.compose.yaml up -d --no-deps api
```

The overlay supplies an empty customer URL by default. If a real customer app URL
is available, set NOTIFICATION_CUSTOMER_APP_URL before the same command. Do not
point it at the staff dashboard or invent a URL. For deployments, set the two API
environment variables in the deployment's normal server configuration.

6. In Settings > Notifications > Manage notifications, confirm automatic email is
   on. Check inactivity now (optional: the periodic planner also runs). Then leave
   the API running; no Send button is needed for the inactivity email.
7. Inspect Activity and your Mailtrap inbox. SMTP accepted = sent, not delivered.
   Mailtrap Sandbox captures email; it does not deliver to the recipient's real inbox.
8. Refresh after another batch to confirm no duplicate. Test opt-out, quiet hours,
   and a new login on the controlled customer before broader activation.

To stop **new automatic sends**, disable the worker and recreate the local API:

```bash
NOTIFICATION_AUTOMATION_ENABLED=false docker compose -f compose.yaml -f docs/backend/notification-automation.compose.yaml up -d --no-deps api
```

An SMTP request already in progress may finish. Disabling does not delete jobs
or disable authentication/security email. Keep the normal local SMTP sending
disabled or sandbox-only until the lead approves real delivery.

## What is intentionally not claimed as complete

| Feature | Current boundary |
| --- | --- |
| Automatic goal/habit reminders | Need agreed due times, scheduling rules and event source. Manual requests/composer remain available; never guess that every incomplete habit is late. |
| Push delivery | Not connected; requires provider and device registration. Existing UI stays labelled not connected. |
| KiroMoney | Monitoring screen exists; no live generation/provider events or private conversation access is invented. |
| Synctera/provider health | Live API/database checks and staff observations exist; external provider adapters are not connected. |
| Delivery/bounces | SMTP acceptance only; provider receipts/webhooks still missing. |
| Mobile/role-assignment integration | Left unchanged; owned by other team work. |

These are visible integration boundaries, not simulated successful functionality.
No outbound messages are sent by automated tests.
