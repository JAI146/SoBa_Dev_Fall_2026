# System & Provider Health

Open `/dashboard/system-health` from the dashboard sidebar.

## Access

The API requires an authenticated administrator with `settings.limited` or a higher settings permission to read the page. Super admins have this permission by default; managers can read. Recording an observation requires `settings.full`. Custom roles use the same server-side permission checks. Hiding the form is only a UX measure.

## What the page measures

- PurposeMint API: this authenticated health endpoint answered. This does not certify every API route.
- PostgreSQL: a read-only `SELECT 1` check. A failed check or 3-second timeout produces Failed.
- Synctera KYC, Banking and Payments, KiroMoney, Notification Provider: this repository currently has no live provider health adapters. These begin as Action Required / Not monitored. Staff can record verified observations. Adding a provider to the catalog alone does not enable monitoring.

Checks refresh every 30 seconds while the page is visible. The backend shares observations for up to 15 seconds to reduce repeated database queries. Timed-out database operations remain subject to the PostgreSQL driver's own connection/query limits; the HTTP observation is bounded. If authentication or the API is unavailable, the browser shows an explicit unconfirmed-health warning. Authorization itself depends on the database, so the page cannot always diagnose a complete database outage through this API.

## Status and issue scope

Healthy, Degraded, Failed and Action Required are separate from issue categories: PurposeMint-side, Provider-side, Data synchronization, User-specific and Undetermined. A category is an operational assessment, not an automatically proven root cause. No external URLs or credentials are accepted by the health report endpoints.

Overall status gives precedence to Failed, then Action Required, then Degraded, then Healthy. Missing monitors therefore prevent the page from implying everything is healthy. A provider's displayed status uses its latest global staff report; reports expire after 24 hours and become Action Required. The history keeps the originally reported status and labels expired observations.

A user-specific incident requires a real customer UUID, appears in the history and never changes the provider-wide status. Record a subsequent Healthy observation for the same service and user to document resolution. Do not enter secrets, account details or private coaching content in summaries.

## Persistence and audit

Observations use the existing append-only `audit_events` table with action `system_health.reported`. The writer records actor, timestamp, service, previous/current state and outcome atomically. A service-scoped PostgreSQL advisory lock serializes concurrent observations. No new table, migration or seed reset is required. The page displays the latest 50 observations. API/database staff observations appear in history but cannot override their live checks.

## Local verification

```bash
pnpm --filter @purposemint/contracts build
pnpm --filter @purposemint/api check-types
pnpm --filter @purposemint/dashboard check-types
pnpm --filter @purposemint/api test --runInBand system-health.service.spec.ts
```

In the browser, confirm seven service cards, unmonitored provider labels, status/category filters, a successful staff observation after refresh, a user-specific observation that does not change provider-wide health, and an unauthorized staff account receiving a permission error. Check phone width as well. Automatic provider polling, synchronization telemetry, historical uptime and external incident feeds require the relevant integration adapters and are not supplied by this initial implementation.
