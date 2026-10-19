# Notification preferences and admin operations (14.1–14.4)

**Delivery update:** the earlier phase descriptions below predate SMTP and the
inactivity worker. Current manual sending is documented in
[notification-email-setup.md](notification-email-setup.md); explicitly enabled,
HTML inactivity email delivery is documented in
[notification-automation.md](notification-automation.md). Goal/habit triggers,
push delivery, and live KiroMoney remain unconnected.

Customer notification management is in the mobile Profile screen. Optional categories have independent push/email choices. Security, critical app updates and transactions remain enabled on both channels; the API rejects attempts to disable them. Existing category choices are preserved. New optional categories default off. Customers can also set optional opt-out and timezone-aware quiet hours.

Authorized staff can open **Notification operations** in the dashboard. `notifications.view` permits queue status/filter/pagination and customer preference lookup. `notifications.edit` permits optional category configuration, queue intentions and eligibility rechecks. Required categories cannot be changed. Changes are recorded in the existing audit log.

The generated `NotificationOperations1791770000000` migration adds the category registry and operational queue tables. It does not reset the database. Defaults initialize idempotently when the API starts.

Queue forms record event metadata, never private message bodies. Mandatory events create both channel records. Optional records respect consent, active account status, category/channel capabilities and quiet hours. Repeated request IDs do not duplicate records. Preference and category changes reconcile pending records. An eligibility recheck allows at most five requests per record and does not increment delivery-attempt counts.

## Integration boundary

**Actual sending and provider status ingestion are blocked by insufficient integration requirements.** There is no delivery worker or webhook in this phase. Eligible records remain `blocked` with `provider_not_configured`; unavailable or opted-out records are `suppressed`. No screen mutation fabricates `sent` or `delivered` status. Those states are supported for future verified provider evidence. Minimum category intervals apply to re-engagement planning with a seven-day floor. Other category dispatch rate limits still need delivery integration. KiroMoney operational metadata (14.4) is available as described below; live integration remains unavailable.

Before production delivery, select providers, credentials, event templates, delivery webhooks, retry rules and consent/frequency policies. Enforce current eligibility again at dispatch time.

## Validation

API, dashboard and mobile type checks pass. Twelve Jest checks cover preference invariants, route permission metadata, strict queue payload validation, legacy preference preservation and quiet hours across daylight saving time. PostgreSQL-compatible PGlite integration checks exercise real migrations, persistence, idempotency, dual mandatory channels, opt-out/category reconciliation, retry limits, filtering, permission summaries and transactional audit writes. Migration apply, rollback, reapply and schema drift checks pass. These checks do not replace real Docker/PostgreSQL concurrency or browser/device validation.

## Automatic re-engagement (14.3)

The API starts a planner that checks once per minute. Each scan processes up to 100 candidate customers and 100 customers with pending plans. UUID cursors rotate through batches. PostgreSQL advisory locks prevent overlapping scan transactions, while unique inactivity/channel keys prevent duplicate plans across restarts. A local overlap guard protects the timer, and shutdown clears it.

Inactivity means **72 elapsed hours** since the latest login, falling back to account creation for a never-logged-in account. This is a rolling duration, not three calendar dates. Only active, verified, nondeleted customers qualify. Re-engagement uses the optional Other optional communications category, respecting independent push/email preferences, optional opt-out, category/channel availability and timezone-aware quiet hours. It never uses mandatory notification categories.

At most one plan per inactivity spell per channel is created. Across different inactivity spells, the limit is at least seven days; a longer configured category interval takes precedence. Existing planned, suppressed and cancelled records count toward this conservative cooldown. Quiet hours defer the planned time. Actual provider sending remains blocked.

The planner cancels pending reminders after a newer login, including when the user later becomes inactive again. Retry and preference changes cannot revive that old reminder. Preference/category changes suppress plans that are no longer eligible. Future dispatch must recheck consent, inactivity and cooldown before sending. The planned event stores no private message body or conversation content. A future provider template should be a gentle invitation to check in on goals, and still requires template/provider configuration.

Authorized staff can use **Check inactivity now** in Notification operations. The result shows eligible accounts examined and channel records planned, cancelled or suppressed. The endpoint scans one batch, accepts no client-selected time or recipients, and requires notifications.edit. Automatic scans audit as the system; manual scans retain the authenticated staff actor. The re_engagement event type is reserved from manual queue forms.

Verification: 18 Jest checks cover the combined stages, including the exact 72-hour boundary, stale login baselines, reserved events and timer startup/overlap/shutdown. PGlite database checks cover eligibility, independent channels, quiet hours, repeat scans, return cancellation, both cooldowns, more than 100 customers and audit rollback. API/dashboard/mobile type checks pass. Real provider delivery, multi-process PostgreSQL contention and browser/device QA remain outside these checks.

## KiroMoney operational visibility (14.4)

**KiroMoney operations** opens a separate read-only page at `/dashboard/coaching`. The API route `/api/admin/coaching-operations` requires an authenticated admin and the dedicated `coaching_operations.view` permission. Super admins and managers receive that permission by default; custom roles can be granted it independently. No endpoint exposes coaching conversations or lets dashboard staff invent generation/delivery results.

The generated `CoachingOperations1791774000000` migration adds `coaching_operations`. It contains event type, generation status, delivery status, safe error code, safety flags, evidence source and creation/update times. It has no user, prompt, response or conversation columns. API projections explicitly whitelist fields; unknown event/error/status text is mapped to safe codes. Prompt/event types use a closed starter taxonomy and must be mapped by a future adapter. Data is paginated in groups of 20 and filterable by event, generation, delivery, flag and source. Global totals include explicitly labelled development samples.

KiroMoney service status uses the latest global staff observation from System & Provider Health. User-specific incidents cannot overwrite service health. Observations older than 24 hours become Action Required; no observation means No monitor connected. Free-form staff report summaries are not exposed in this page. Status observations are not live provider telemetry.

**Live generation, provider event ingestion and delivery remain blocked by insufficient integration requirements.** No provider adapter, webhook, coaching execution or private transcript lookup is added. The page is intentionally empty until real operational metadata or explicitly labelled test records exist. Development samples are never auto-seeded or presented as provider evidence. A future server-side adapter must validate metadata, map errors/flags, establish idempotent event provenance and obey customer preferences before delivery. Conversation access would require a separate explicit authorization and privacy design.

Validation: generated migration apply/drift/rollback/reapply checks pass. PGlite integration covers metadata persistence, global counts, all filters, three pages of data, evidence source, unconnected service status, current/expired staff reports, privacy projection and exclusion of user-specific health incidents. The combined notification/coaching suite has 24 passing checks. API, dashboard and mobile type checks pass. Browser/device layout validation and real provider telemetry remain outstanding.
