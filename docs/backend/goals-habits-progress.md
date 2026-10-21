# Admin purpose, goals, and habit progress

The user detail page combines the existing selected values (Purpose), focus goal,
target, saved amount, remaining amount, progress, status, and creation date with
recorded goal history and per-habit behavioral progress.

## Rules for this implementation

These defaults are explicit and testable, and should be reviewed with the product
lead before being treated as final product policy:

- Daily: one completion per customer-local calendar day.
- Weekly: at least one completion per Monday–Sunday customer-local week.
- As-needed: completions are shown; no deadline, missed count, consistency, or streak.
- Completed: the current day/week has a completion. This does not retire the habit.
- Missed: the previous eligible elapsed period had no completion, and the current
  period has not been completed. An unfinished current period is never late.
- Paused: an explicit pause event, not deselection or inactivity.
- Recovering: the current period is completed after a missed previous eligible period.
  Another consecutive completed period returns to the normal completed state.
- Active: selected, not paused, and currently neither completed nor recovering/missed.
- Inactive: deselected. This remains distinct from an explicit pause.
- Consistency: completed eligible closed periods / all eligible closed periods in
  the last 30 calendar days. Weekly scores include only complete weeks within the
  window; the earliest partial week is excluded. No eligible periods means no score.
- Explicit pauses take effect for the entire local date, exclude paused days, and
  freeze streaks. Resume includes its local date. A partially paused week remains
  eligible if at least one selected, unpaused day exists. A fully paused week is excluded.
- Streaks count consecutive completed eligible days/weeks. An unfinished current
  period keeps the previous streak until its deadline. Deselection breaks a streak.

Older habits lack reliable historical selection/pause records. Active legacy
habits assume their initial selection continued until the first recorded change,
and expose `historyLimited`. Inactive legacy habits with no lifecycle history
show unavailable missed counts/consistency/streaks. No fictional pauses are inferred.

## Recording and viewing history

Existing `audit_events` stores before/after snapshots in the same transaction as
goal creation, focus changes, onboarding goal skip, and customer savings writes.
Failed audit writes roll back the associated mutation. Repeated focus selection
does not produce a fake modification. Events show customer actor ID, timestamp,
previous state, and current state. The admin user detail endpoint includes the
latest 100 goal changes and a truncation flag. Earlier changes and direct SQL
edits cannot be reconstructed; there is no retroactive history backfill.

Habit selection changes are also recorded transactionally in onboarding and
the existing habit picker endpoint. Customers can explicitly pause/resume a
selected habit through the authenticated API:

```http
PATCH /api/habits/:userHabitId/pause
Content-Type: application/json

{"paused": true}
```

Use `{"paused": false}` to resume. Ownership and completed onboarding are checked.
Paused habits stay selected, expose `isPaused` in the customer dashboard payload,
and cannot accept new completions until resumed. The existing mobile habit picker
still selects/deselects habits; adding a mobile pause/resume control is a separate
customer-app change. The admin page is read-only and does not change a customer's habits.

No schema changes or migrations are needed: these features reuse existing
audit and completion tables. The existing reflection streak calculation is untouched.

## Local development examples

After the existing mock seed, optionally run:

```bash
docker compose exec api pnpm --filter @purposemint/api seed:progress
```

Open Jordan (`demo.customer.02@purposemint.local`). Separate, clearly named demo
habits cover active, completed, missed, paused, recovering, weekly, as-needed, and
inactive examples. A separate demo goal has clearly labelled sample history.
The fixture script is insert-only, refuses production, and preserves subsequent
developer changes. It does not replace the team's original mock seed or change
its original goals/habits. Example dates stay fixed after their first insertion,
so statuses naturally change as time passes.

## Checks

```bash
pnpm --filter @purposemint/contracts build
pnpm --filter @purposemint/api check-types
pnpm --filter @purposemint/dashboard check-types
pnpm --filter @purposemint/api test --runInBand habit-progress.spec.ts goal-history.spec.ts habit-pause.spec.ts
git diff --check
```

Check Jordan and a customer with no habits/goals; filter each habit state; filter
history by goal; inspect narrow and desktop layouts. For live history, change a
customer's focus or add savings through the existing customer API and refresh the
admin page. For pause, use the customer token, verify completion is rejected while
paused, then resume and verify completions can be recorded again.

## Savings consistency and charts

The user detail API now includes per-goal contribution analytics and an overall
view. Weekly charts show up to 12 Monday–Sunday weeks; monthly charts show up to
6 calendar months, in the customer's timezone. A positive recorded contribution
marks a period as contributed. Only whole elapsed periods beginning on/after goal
creation enter the score. The partial starting period and current unfinished
period are excluded. A missed period means no contribution entry was recorded;
it does not establish a missed contractual payment or a failure to save.

Provisional color rules: green ≥80%, yellow 50–79%, red <50%, unavailable when no
eligible periods exist. The API owns these classifications. Overall savings
consistency is weighted by eligible goal-periods across currently active goals,
not a simple average of goal percentages. Inactive goals can be inspected but do
not affect overall scores. The overall habit percentage is weighted by eligible
elapsed periods across selected scheduled habits; as-needed/unknown history is
excluded. Savings and habit scores remain separate rather than inventing a
combined financial-wellness score.

Charts show recorded positive entries only. The cumulative chart includes earlier
recorded entries before the visible window. It does not infer deposits from a
saved balance. If the recorded total differs from the displayed goal balance,
the UI explicitly shows the difference. Direct SQL edits and deleted records can
cause differences; an empty record history is labelled rather than treated as
proof the customer failed to save. Future and pre-creation entries are excluded.

The optional seed adds an insert-only, separate `Demo savings consistency timeline`
goal for Jordan, with 100 days of history and deliberate gaps. Rerun `seed:progress`
after applying the update to add it; existing goals/habits remain unchanged.

The user page uses scoped CSS Modules with 18px section headings, 14px table/body
text, and 24px activity metrics. Shared grid containers can shrink and table
scrolling stays within cards. Charts resize to their available width. Goal and
habit calculation defaults require product-lead review before final policy.
