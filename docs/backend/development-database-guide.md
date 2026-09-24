# PurposeMint development database guide

Reviewed against repository source and local Docker row counts on September 23, 2026.

This guide describes the Docker PostgreSQL database, its tables, and the data
created by the current seed scripts. Counts below are **expected on a fresh
database after migrations, API startup, and mock seeding**, not a live database
snapshot. The fixture counts were also verified against one local development
database; session/audit counts can vary with usage. Each teammate has their own
local database volume; edits are not shared.

## 1. Open the database in your browser

Start Docker Desktop and wait for its Linux engine to run. From the repository
root, run:

```powershell
# First setup: build/start the app, apply migrations, and seed data
docker compose up --build --detach

# Start the optional database browser (also starts PostgreSQL if necessary)
pnpm docker:db
```

Open **http://localhost:8082** and enter:

| Login field | Value |
| --- | --- |
| System | PostgreSQL |
| Server | `db` |
| Username | `purposemint` |
| Password | `purposemint` |
| Database | `purposemint` |

Select the `public` schema if prompted. Click a table's name to inspect its
columns, keys, and indexes; use **Select data** to browse its rows. Use **SQL
command** for the queries later in this guide. The viewer can also edit/delete
data with this development account, so use Select data for inspection.

The viewer uses the official [Adminer Docker image](https://hub.docker.com/_/adminer).
Its web port is bound to your computer's loopback address. The `tools` profile
keeps it optional. Starting only the viewer does not run migrations or seeds;
use the full-stack command above on a new checkout.

Stop the viewer with `docker compose stop db-viewer`. Stop the entire stack,
including the optional viewer, with `docker compose --profile tools down`.
Stopping containers preserves the database. **`pnpm docker:reset` deletes
development volumes, including the database; it is not a routine restart.**

### Connecting from a desktop SQL client

For pgAdmin, DBeaver, or another client running on your computer:

| Field | Value |
| --- | --- |
| Host | `localhost` |
| Port | `5432` |
| Database / username / password | `purposemint` for all three |
| SSL | Disabled for this local stack |

Inside Docker, the host is `db`; outside Docker, the host is `localhost`.
The dashboard application login (`admin@purposemint.local` / `PurposeMint123!`)
is separate from these database credentials.

## 2. How data arrives

1. PostgreSQL creates the database and stores it in a named volume.
2. The `migrate` service applies seven current TypeORM migrations.
3. The API starts and `SeedService` creates the administrator and reference catalogs.
4. The `mock-data` service inserts 24 customers and pathway/upgrade examples.
5. The dashboard starts once mock seeding succeeds.

Sources of truth:

- [Schema migrations](../../apps/api/src/database/migrations)
- [TypeORM entities](../../apps/api/src/entities)
- [Reference seed behavior](../../apps/api/src/database/seed.service.ts)
- [Customer/activity mock seed](../../apps/api/scripts/seed-mock-data.mjs)
- [Values, goal templates, habit templates](../../apps/api/src/database/onboarding-seed-data.ts)
- [Pathways, partners, checklist templates](../../apps/api/src/database/pathways-seed-data.ts)
- [Plans and challenges](../../apps/api/src/database/membership-seed-data.ts)
- [Reflection themes](../../apps/api/src/database/reflection-seed-data.ts)

## 3. Complete table inventory

There are 27 application tables plus TypeORM's `migrations` table. Column names
below are PostgreSQL names, with the main fields listed for navigation; use the
viewer or the schema query in section 6 for the complete column/type inventory.
Database access does not imply that a dashboard page or API endpoint exposes
every field.

### Accounts and operations

| Table | Purpose and useful columns | Fresh seed coverage |
| --- | --- | --- |
| `users` | Accounts: `id`, `email`, `first_name`, `last_name`, `display_name`, `user_type`, `admin_role`, `status`, `tier`, `onboarding_status`, `onboarding_completed_at`, `current_level`, `current_level_source`, `current_level_assigned_at`, `time_zone`, `last_login_at`, `created_at`, `deleted_at`; notification/policy JSON | 25: 1 administrator + 24 customers; 19 mock level assignments |
| `user_sessions` | Authentication sessions: `user_id`, `family_id`, `client_type`, `expires_at`, `rotated_at`, `revoked_at`, `revoked_reason`; token hash | No seed; login/refresh creates rows (3 observed locally) |
| `user_otps` | Verification/reset codes: `user_id`, `type`, `expires_at`, `attempts`, `consumed_at`; code hash | No seed; authentication flows create rows |
| `audit_events` | Operation trail: `actor_user_id`, `actor_type`, `action`, `entity_type`, `entity_id`, `outcome`, `metadata`, `created_at` | No fixtures; application actions create rows (36 observed locally). Actor ID intentionally has no user foreign key |
| `smtp_config` | Mail configuration: `smtp_server`, `smtp_port`, `smtp_email_user`, `smtp_email_password`, `from_email`, `smtp_enabled` | Conditional environment seed; not supplied by Compose |
| `s3_config` | Storage configuration: `access_key_id`, `secret_access_key`, `region`, `bucket` | Conditional environment seed; not supplied by Compose |
| `migrations` | TypeORM schema history: `id`, `timestamp`, `name` | 8 applied migration records, not business fixtures |

Credential/hash columns are directly visible to this database account even when
the API excludes them. Do not copy them into reports or screenshots.

### Values, goals, savings, and habits

| Table | Purpose and useful columns | Fresh seed coverage |
| --- | --- | --- |
| `values` | Value catalog: `id`, `key`, `label`, `description`, `icon_name`, `color_token`, `sort_order` | 9 catalog values |
| `user_values` | Selected values: `user_id` → users, `value_id` → values, `created_at` | 48: two selections per customer |
| `goal_templates` | Suggested goals: `id`, `title`, `value_key` → values.key, `target_amount`, `is_pathway_eligible`, `sort_order` | 9 templates |
| `user_goals` | Actual goals: `user_id`, `title`, `target_amount`, `saved_amount`, `source_template_id`, `is_active`, `is_focus`, `is_pathway_eligible`, `created_at`, `updated_at` | 35: active/inactive, no/partial/full progress |
| `savings_entries` | Manual savings records: `user_id`, `user_goal_id`, `amount`, `note`, `created_at` | 82 dated entries |
| `habit_templates` | Habit catalog: `id`, `title`, `description`, `frequency`, `category`, `sort_order` | 8 templates |
| `user_habits` | Assigned habits: `user_id`, `source_template_id`, `is_active`, `created_at`, `updated_at` | 57: 51 active, 6 inactive |
| `habit_completions` | Completed dates: `user_id`, `user_habit_id`, `completed_on`, `created_at` | 319 dated completions, with intentional gaps |

The Goals and Habit Progress tables now contain linked fixture records. Templates
remain separate catalog options; use the `user_*` tables for each customer's
actual choices and activity.

`user_goals.saved_amount` is a cached sum of that goal's savings entries. Only
one goal per user may have `is_focus = true`. A user cannot select the same
value or habit template twice; a habit cannot have two completions on the same
`completed_on` date. That date represents a calendar day, while `created_at` is
a timestamp. `is_active = false` alone does not record pause dates or distinguish
paused, missed, and recovering states.

### Pathways and partners

| Table | Purpose and useful columns | Fresh seed coverage |
| --- | --- | --- |
| `pathways` | Catalog: `key`, `title`, `description`, `minimum_amount`, `why_this_amount_body`, `why_this_amount_breakdown`, `source_label`, `source_url`, `sort_order` | 6 pathways |
| `partners` | Partner catalog: `id`, `pathway_key`, `name`, `partner_type`, `location_label`, `capability_tags`, `is_active`, `sort_order` | 13 partners; several are invented placeholders |
| `checklist_templates` | Pathway tasks: `id`, `pathway_key`, `category`, `title`, `description`, `sort_order` | 42: 7 per pathway |
| `pathway_applications` | User applications: `user_id`, `pathway_key`, `attested_amount`, `attestation_accepted_at`, `verification_method`, `status`, `submitted_at` | 19: 15 submitted + 4 draft; all self-attested |
| `pathway_application_partners` | Application/partner selections: `application_id`, `partner_id`, `created_at` | 19: one partner per seeded application |
| `pathway_checklist_items` | Application task progress: `application_id`, `checklist_template_id`, `is_complete`, `completed_at` | 133: seven per application, mixed completion |

### Reflections, membership, and challenges

| Table | Purpose and useful columns | Fresh seed coverage |
| --- | --- | --- |
| `reflection_themes` | Theme catalog: `key`, `label`, `color_token`, `match_keywords`, `encouragement_line`, `sort_order` | 4 themes |
| `reflections` | User journal entries: `user_id`, `kind`, `body`, `mood_score`, `duration_seconds`, `reflected_on`, timestamps | 6 text reflections |
| `reflection_theme_matches` | Reflection/theme relationships: `reflection_id`, `theme_key` | 6 progress-theme matches |
| `subscription_plans` | Offering catalog: `key`, `name`, `price_monthly`, `features`, `badge`, `description`, `cta_label`, `sort_order` | 3 plans |
| `upgrade_intents` | Recorded upgrade interest: `user_id`, `plan_key`, `created_at` | 8: four growth + four elevate; not payments or active subscriptions |
| `community_challenges` | Challenges: `key`, `title`, `description`, `active_month`, `is_active`, `sort_order` | 4, dated August–November 2026 |
| `challenge_participations` | User participation: `user_id`, `challenge_id`, `joined_at`, `completed_at` | 4, mixed completion status |

## 4. Seeded catalog contents

### Values

`financial_peace` (Financial Peace), `progress` (Progress), `stability` (Stability),
`joy_self_care` (Joy & Self-Care), `family_first` (Family First), `independence`
(Independence), `confidence` (Confidence), `balance` (Balance), and
`learning_skills` (Learning & Skills).

### Goal templates

| Title | Value key | Target | Pathway eligible |
| --- | --- | ---: | --- |
| 'Just in case' emergency stash | financial_peace | 100 | No |
| Reliable vehicle down payment | financial_peace | 1500 | Yes |
| Rent buffer & housing stability | financial_peace | 1500 | Yes |
| Career certification fund | progress | 350 | Yes |
| Side hustle or business starter | progress | 1000 | Yes |
| Resume or headshot refresh | progress | 60 | No |
| Housing security deposit savings | stability | 1500 | Yes |
| Car repair & vehicle fund | stability | 1500 | Yes |
| Childcare rainy day fund | stability | 500 | Yes |

### Habit templates

| Title | Frequency | Category |
| --- | --- | --- |
| Transfer Tuesday | weekly | money |
| Money Journal | daily | money |
| No-Spend Saturday | weekly | money |
| Coffee Fund Redirect | weekly | money |
| Mood Check-In | daily | mindset |
| Weekly Goal Review | weekly | motivation |
| Affirmation Moment | daily | motivation |
| List Before Shopping | as_needed | mindset |

### Pathways and partners

| Pathway key | Minimum amount | Seeded partner names |
| --- | ---: | --- |
| vehicle | 2500 | Community Auto Finance Network; Reliable Ride Resource Center |
| housing | 3000 | HUD-Approved Housing Counseling; Pelican State Credit Union; Habitat for Humanity Louisiana |
| childcare | 1200 | Family Care Access Collaborative; Bright Start Community Center |
| workforce | 750 | Skills Forward Louisiana; Trade Ready Training Fund |
| business | 2000 | Main Street Microenterprise Center; Community Enterprise Credit Union |
| living-benefits | 600 | Family Protection Resource Network; Community Benefits Navigator |

Each pathway has seven checklist templates across `documentation`,
`financial_review`, `consultation`, and `next_steps`. Browse
`checklist_templates`, sorted by `pathway_key` and `sort_order`, for their full
titles/descriptions. A pathway-eligible goal template is not itself a link to a
specific pathway; its target may differ from the pathway minimum.

### Plans, themes, and challenges

| Plan key | Display name | Monthly price |
| --- | --- | ---: |
| free | Starter | 0 |
| growth | Momentum | 19 |
| elevate | Elevation | 49 |

Plan feature text includes future banking capabilities; seeded marketing text
does not mean those integrations exist.

Reflection themes are `money`, `progress`, `family`, and `goals`. Each includes
keyword matching and an encouragement message.

| Challenge key | Title | Active month |
| --- | --- | --- |
| no-spend-weekend-2026-08 | No-Spend Weekend Challenge | 2026-08-01 |
| cook-what-you-have-2026-09 | Cook-What-You-Have Challenge | 2026-09-01 |
| one-bill-check-in-2026-10 | One-Bill Check-In | 2026-10-01 |
| small-gift-plan-2026-11 | Small-Gift Plan | 2026-11-01 |

All four have `is_active = true`; their month dates are fixed, not rolling.

## 5. Mock customers and reseeding behavior

Customer emails run from `demo.customer.01@purposemint.local` through
`demo.customer.24@purposemint.local`. Names run from Avery Bennett to Blair Evans;
use the user query below to list the complete roster. Seeded customer passwords
are `Customer123!`, but these customer accounts cannot sign into the admin
dashboard, and pending/suspended accounts have the corresponding restrictions.

Fresh customer distribution:

- Status: 18 active, 3 suspended, 3 pending email.
- Tier: 16 free, 4 growth, 4 elevate.
- Onboarding: 19 completed, 2 in progress, 3 not started.
- Current PurposeMint level (presentation fixtures, **not calculated**): Level 1 = 7,
  Level 2 = 5, Level 3 = 4, Level 4 = 2, Level 5 = 1; five incomplete
  customers have no assigned level. `current_level_source = 'mock'` distinguishes
  these from future calculated or manual assignments.
- Location/time zone: Baton Rouge, Louisiana, United States; America/Chicago.
- Registration: 2–71 days before seed execution; login dates are spread across
  the previous 0–19 days.
- Completed customers receive goals, habits, and dated activity; incomplete
  customers have values selected but no goal or habit progress.
- Attested amounts are synthetic (1075–4925 among generated applications),
  independent of actual savings entries and not guaranteed to meet each
  pathway's minimum. Do not use them as verified eligibility examples.

Customer IDs normally use `00000000-0000-4000-8000-` followed by a 12-digit
customer number. Application IDs use the `8100` group and intent IDs use `8200`.
Reference UUIDs are generated during seeding and can differ between teammates;
join by relationships or stable catalog keys instead of copying UUIDs.

The reference seed runs at API startup:

- Values, goal/habit templates, partners, and checklist templates are inserted
  only when their entire table is empty. Removing one row will not restore it.
- Pathways, reflection themes, plans, and challenges are upserted by key.
  Seeded fields can overwrite manual changes when the API restarts.
- The configured administrator is created or restored to active super-admin
  status. An existing administrator's password is not reset by this seed.
- SMTP/S3 configuration is inserted only with the required environment fields
  and an empty configuration table.

The mock seed uses a transaction and conflict handling. It inserts the new
goal/habit/reflection fixtures when absent. It recalculates each seeded goal's
`saved_amount` from all its entries, including entries later created through
the API. Rerunning also updates selected customer/application fields and
checklist progress while retaining other edits. **It can overwrite edits to
some fixtures.** With the API already
healthy and reference catalogs present, rerun using:

```powershell
docker compose run --rm --no-deps mock-data
```

Rerunning the mock seed updates its own level assignments but preserves levels
whose source is `calculated` or `manual`. The current-level columns do not
provide advancement rules or historical level transitions.

## 6. Useful read-only SQL

Paste these into the viewer's SQL command screen.

### Every table and column, including types and defaults

```sql
SELECT table_name, column_name, data_type, udt_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### All customers without password hashes

```sql
SELECT id, email, first_name, last_name, status, tier, onboarding_status,
       last_login_at, created_at
FROM users
WHERE user_type = 'customer'
ORDER BY email;
```

### Exact counts for the progress feature tables

```sql
SELECT 'user_values' AS table_name, count(*) FROM user_values
UNION ALL SELECT 'user_goals', count(*) FROM user_goals
UNION ALL SELECT 'savings_entries', count(*) FROM savings_entries
UNION ALL SELECT 'user_habits', count(*) FROM user_habits
UNION ALL SELECT 'habit_completions', count(*) FROM habit_completions;
```

### Demo level distribution

```sql
SELECT current_level, current_level_source, count(*)
FROM users
WHERE user_type = 'customer'
GROUP BY current_level, current_level_source
ORDER BY current_level NULLS LAST;
```

### Selected user values

```sql
SELECT u.email, v.key, v.label, uv.created_at
FROM user_values uv
JOIN users u ON u.id = uv.user_id
JOIN "values" v ON v.id = uv.value_id
ORDER BY u.email, v.sort_order;
```

### Goals and their savings totals

```sql
SELECT u.email, g.id, g.title, g.target_amount, g.saved_amount,
       COALESCE(SUM(s.amount), 0) AS entry_total,
       g.is_active, g.is_focus
FROM user_goals g
JOIN users u ON u.id = g.user_id
LEFT JOIN savings_entries s ON s.user_goal_id = g.id
GROUP BY u.email, g.id
ORDER BY u.email, g.title;
```

### Habits and their dated completions

```sql
SELECT u.email, h.id, t.title, t.frequency, h.is_active, c.completed_on
FROM user_habits h
JOIN users u ON u.id = h.user_id
JOIN habit_templates t ON t.id = h.source_template_id
LEFT JOIN habit_completions c ON c.user_habit_id = h.id
ORDER BY u.email, t.sort_order, c.completed_on;
```

The three user-progress queries above return linked records on the current
fresh seed. For example, the goals query can expose goals with no savings,
partial savings, and goals that have reached their target.

### Pathway application progress

```sql
SELECT u.email, a.id, a.pathway_key, a.status, a.attested_amount,
       COUNT(c.id) AS checklist_total,
       COUNT(c.id) FILTER (WHERE c.is_complete) AS checklist_complete
FROM pathway_applications a
JOIN users u ON u.id = a.user_id
LEFT JOIN pathway_checklist_items c ON c.application_id = a.id
GROUP BY u.email, a.id
ORDER BY u.email;
```

## 7. Troubleshooting

| Symptom | What to check |
| --- | --- |
| Missing `dockerDesktopLinuxEngine` pipe | Start Docker Desktop, wait for the Linux engine, then run `docker version` |
| Browser cannot reach port 8082 | Run `pnpm docker:db`; inspect `docker compose --profile tools ps` and `docker compose logs db-viewer` |
| Login connection refused | Select PostgreSQL and use server `db` in the browser; use `localhost:5432` only in a desktop client |
| Password authentication fails | Use database credentials, not the dashboard admin login. An existing volume retains its original PostgreSQL password |
| No tables | Run full-stack startup; inspect `docker compose logs migrate` |
| Tables exist but catalogs are empty | Inspect `docker compose logs api`; reference seeding happens on API startup |
| Catalogs exist but mock customers are missing | Inspect `docker compose logs mock-data` |
| Goals/habits tables are empty | Run `docker compose run --rm --no-deps mock-data` after the API has seeded reference catalogs |
| Port already allocated | Another local app uses 5432 or 8082; change the corresponding host port in Compose and connection settings |

Terminal fallback, without a desktop PostgreSQL installation:

```powershell
docker compose exec db psql -U purposemint -d purposemint
```

At the psql prompt: `\dt` lists tables, `\d user_goals` shows a table's structure,
and `\q` exits.

## 8. Future scope

There are currently no dedicated tables for banking accounts, KYC/provider
events, payments, reconciliation, badges/awards, level transition history,
support cases, notification delivery history, custom role permissions, or full
subscription/billing history. They should not be inferred from similarly named
fields or plan descriptions. The current savings model records manual progress.

When adding a feature, update migrations/entities for schema changes, extend
appropriate seed fixtures, and revise this inventory. Keep future goal totals
consistent with savings entries, and preserve habit date/time-zone semantics.

### Table cleanup review

No application table is demonstrably unnecessary at this point. Empty tables
serve distinct runtime purposes: `user_otps` and `user_sessions` support auth;
`smtp_config` and `s3_config` are optional integration configuration;
`audit_events` is generated by operations. The feature tables seeded above are
referenced by the API. TypeORM's `migrations` table tracks applied schema
changes. Removing any of these because a fresh database has zero rows would
break a supported flow or migration tracking. No tables were dropped.
