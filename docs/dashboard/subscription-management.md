# Subscription and plan management

The Admin Control Center exposes `/dashboard/subscriptions` with Plans and Subscriptions tabs. Plans, subscriptions, agreed billing terms, payment outcomes, and change history are separate database records. Administrators can create arbitrary plan keys using supported capabilities without changing application code. No dependencies were added, and the mobile app was not edited.

## Merge boundaries

| Area | Feature files |
| --- | --- |
| Contracts | `packages/contracts/src/subscription-management.ts` |
| API | `apps/api/src/subscription-management/` |
| Dashboard | `apps/dashboard/features/subscription-management/`, thin `app/dashboard/subscriptions/page.tsx` |
| Persistence | Extended `subscription-plan.entity.ts`; new `user-subscription`, `subscription-history`, and `subscription-billing-record` entities |
| Migration | `apps/api/src/database/migrations/1791000200000-SubscriptionManagement.ts` |

Shared integration edits are limited to module registration, navigation, audit action exports, dynamic membership/upgrade-intent keys, insert-only plan seeds, and the existing pathways/community challenge access checks. Existing legacy `User.tier` remains for compatibility with other parts of the app; subscription authorization and current membership now use persisted subscriptions. Initial plan names appear only in seed/import configuration, never in subscription business decisions. Before opening a PR, reconcile these integration points and migration ordering with the team's current `main`.

## Configuration and access

Plans support display copy, monthly/yearly USD prices, enabled billing cycles, feature descriptions, active/available flags, availability dates, display order, promotions, and a configurable default free plan. Plan keys are stable, arbitrary slugs up to 20 characters, matching the existing catalog column. Editing never renames a key. There is no delete endpoint; retire plans through Active/Available flags.

Supported entitlements are `pathways` and `communityChallenges`. Supported limits are lifetime counts of pathway applications and challenge participations; `null` means unlimited. Resuming an existing application does not consume another application. Feature descriptions are marketing copy; only configured supported entitlements grant access. Unknown entitlements and invalid limit combinations are rejected by the shared strict schemas.

Exactly one default plan may be configured. It must be active, always available, monthly, free, and without promotional/date restrictions. Selecting another default switches it atomically. New customers are enrolled on first membership/access lookup or the periodic enrollment sweep. Existing customers are imported from their legacy tier by the migration. Docker sample customers are created after migration, so the sample-data seeder also imports their configured membership, with history and audit, in its transaction. It inserts only missing subscriptions and never overwrites an administrator's agreement or history. Changing the default affects future enrollment only.

This checkout has only the `super_admin` role, with none of the shared permissions infrastructure described in the attached dashboard guide. Every administration endpoint therefore requires both an authenticated admin and `super_admin`, enforced by `SubscriptionAdminGuard`. The guard is isolated so a future permissions merge can replace the policy. Role-based sidebar visibility is only a convenience; the API remains authoritative.

Entitlement and limit edits apply centrally to existing active subscribers. Retiring a plan prevents new assignments while retaining existing subscriber access. Cancellation and recorded payment failure revoke access. An administrator's paid-plan assignment starts active access with payment pending; recording an external successful payment confirms payment state, while a failure marks the subscription past due. Payment collection and provider reconciliation are outside this feature.

## Billing and change rules

- Prices are captured as integer cents with plan version, name, cycle, regular price, and promotional expiration. Editing the catalog never changes an existing billing agreement.
- Assignments and changes require the selected plan version. All subscription mutations require the subscription version. Stale requests return a conflict instead of silently overwriting newer work.
- Immediate changes start a new billing period. Renewal changes retain the current subscription until the effective date and capture the target agreement when authorized. Neither path calculates prorations or collects payment.
- Availability and promotional prices are checked at the effective date. An already authorized scheduled agreement survives subsequent plan retirement or price edits. Remove the pending change to revoke that agreement.
- A sweep checks due changes every 30 seconds, with locked, transactional application; reads also apply due changes. Deployments with multiple API processes remain protected by database row locks. Each sweep processes at most 100 due changes and 100 unenrolled customers.
- Monthly and yearly renewal dates use calendar arithmetic, clamping month-end/leap-day dates. Paid renewals advance one period at a time; overdue periods are not silently waived. There is no automatic payment collection or recurring charge job.
- Promotions expire at renewal using the originally agreed regular price. Staff payment records must match the agreed amount, cannot be future dated, and have unique external references. Duplicate successful payments for an already-paid period are rejected.
- Cancellation retains the subscription, billing, and history. Reactivation is a new recorded transition. Every transition records previous/new agreement, action, effective date, recorded date, and authorizing administrator (system enrollment/import uses a null administrator).
- Mutations and their audit events commit atomically. PostgreSQL triggers reject updates/deletes of historical change and payment records, and restrictive foreign keys preserve linked plans and subscriptions.

## API surface

All paths below are relative to `/api/admin/subscription-management` and use the shared request/response schemas.

| Method and path | Purpose |
| --- | --- |
| `GET /capabilities` | Supported entitlement and limit catalog |
| `GET /plans` | Paginated search, active filter |
| `POST /plans`, `PATCH /plans/:key` | Create/edit configuration; versioned updates |
| `GET /subscriptions` | Paginated customer search, status and plan filters |
| `GET /subscriptions/:id` | Current details, change history, payment records |
| `POST /subscriptions` | Assign a customer without a subscription |
| `POST /subscriptions/:id/change` | Plan/cycle change or reactivation |
| `POST /subscriptions/:id/cancel` | Immediate or renewal cancellation |
| `POST /subscriptions/:id/remove-scheduled-change` | Remove a scheduled transition |
| `POST /subscriptions/:id/payments` | Record an external paid/failed outcome |

Customer membership responses consume the same catalog and current subscription. Yearly cycles and promotions are optional additions to the public response; existing clients can continue reading the original fields. Upgrade intents remain requests for administrative assistance and do not themselves change subscriptions.

## Database setup and verification

With a development PostgreSQL configured in `apps/api/.env`, run from the repository root:

```powershell
pnpm --filter @purposemint/contracts build
pnpm --filter @purposemint/api migration:run
pnpm --filter @purposemint/api migration:show
```

Then run the persistence verification from `apps/api`:

```powershell
node scripts/test-subscription-management.cjs
```

The verification uses a migrated development database and rolls back its fixture transaction. It checks real persistence, non-retroactive prices, cycle changes, scheduled cancellation, exactly-once history, access revocation, immutable history, restrictive plan deletion, and atomic audit rollback.

The migration's additive DDL was generated by TypeORM's PostgreSQL QueryRunner in SQL-memory mode because the configured local database was unavailable. `scripts/generate-subscription-migration.cjs` documents and reproduces that generation against the checked-in baseline entity. Its overwrite guard is for unapplied local migrations only. Seed conversion/backfill and append-only protections follow the generated DDL. Review it against the target schema before applying; it has **not** been applied or live-tested in this environment.

Verification on this checkout:

- Contracts build: passed.
- API and dashboard type checks: passed.
- API tests: 6 suites, 46 tests passed, including real PostgreSQL query-builder coverage for enrollment, scheduled changes, and the paginated subscription list.
- New API feature/entities/migration lint: passed with no warnings.
- Dashboard lint and production build: passed, including `/dashboard/subscriptions`.
- Full API lint: 570 existing errors. Comparing each modified existing API file against HEAD showed the same error/warning counts before and after the change.
- PostgreSQL integration: attempted, unavailable (`ECONNREFUSED` on the configured local database). Migration application and restart/persistence verification remain pending.
- Browser checks used an explicitly temporary in-memory API fixture, not a real database: create a configurable plan, inspect subscriptions, schedule a yearly change with preserved history, and exercise loading/error/retry/empty states. At 390px width, dialogs were usable and the page had no horizontal overflow.

## Manual acceptance steps

1. Apply the migration, start the API and dashboard, and sign in as a super administrator. Open Subscriptions.
2. Create Foundation with a new key, $9 monthly/yearly configuration, supported entitlements/limits, and active availability. Reload and restart the API to confirm configuration persists.
3. Open an existing customer's default subscription. Change to Foundation immediately, switch monthly/yearly, upgrade or downgrade to another configured offer, and inspect previous/new agreements and administrator history.
4. Edit catalog prices and verify the customer's agreed billing amount stays unchanged. Edit entitlements and verify pathway/challenge access follows configured permissions and limits.
5. Schedule a change or cancellation at renewal, inspect the pending agreement, and remove it. On a disposable development subscription, set its pending effective date into the past to verify application occurs once.
6. Record external payment failure/success with the exact agreed amount; verify status/access, failure count, and retained billing records. Cancel and reactivate without losing history.
7. Retire an offer and confirm it disappears from customer offerings/new assignments while existing subscribers retain their agreement. Confirm a non-authorized principal receives 403 from every administration route.

Fixture-only screenshots: [desktop plans](subscriptions-desktop.jpg), [desktop history](subscriptions-history-desktop.jpg), [narrow screen](subscriptions-narrow.jpg).

## Subscription list loading fix

The list, customer-enrollment query, and scheduled-change query must use entity property names (`startedAt`, `createdAt`, `renewalAt`) in TypeORM `orderBy`. Using database column names with joins and `take` caused the distinct pagination builder to throw `Cannot read properties of undefined (reading 'databaseName')`, producing a generic 500 before the table could render. The regression test uses actual PostgreSQL entity metadata and executes all three query-building paths with database execution replaced, so this failure is covered without a running database.

The fix introduces no schema changes. Restart/rebuild the API and run the updated sample-data service to populate missing sample subscriptions. Existing persisted agreements remain the authority for the table.
