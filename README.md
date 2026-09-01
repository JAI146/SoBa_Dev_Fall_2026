# PurposeMint

PurposeMint is a values-first savings and financial behavior app. Instead of starting
with a bank connection, it starts with a person's values, turns those into a savings
goal and a small set of daily habits, and — once real savings exist — connects them
with vetted partners (housing, vehicle, childcare, workforce, business, insurance)
through a verified readiness pathway.

The product is built by **Mint To Prosper Foundation**. PurposeMint is the product
name used throughout the app; "Mint To Prosper Foundation" is the parent
organization and appears only where a legal/parent-entity name belongs (footers,
legal pages).

This repository is the whole platform: backend API, customer mobile app, and
internal operations dashboard.

---

## Repository layout

```text
apps/
  api/          NestJS backend — the only source of truth for business rules
  dashboard/    Next.js internal admin/operations dashboard
  mobile/       Expo React Native customer app

packages/
  contracts/    Shared Zod schemas, types, and enums used by all three apps

docs/
  architecture/monorepo-rules.md      full monorepo conventions (read this first)
  mobile/expo-native-guide.md         Expo/EAS build and native workflow
  dashboard/tailwind-guide.md         dashboard styling conventions
  brand/PurposeMint_Brand_Book.pdf    official visual identity reference
```

This is a **pnpm workspaces + Turborepo** monorepo. `pnpm-lock.yaml` is the only
lockfile permitted — never commit `package-lock.json` or `yarn.lock`.

---

## Quick start

```powershell
git clone <repo-url> PM
cd PM
pnpm install

# API
Copy-Item apps\api\.env.example apps\api\.env
# fill in DATABASE_URL, JWT_ACCESS_SECRET (32+ chars), etc.
pnpm --filter @purposemint/contracts build
pnpm --filter @purposemint/api migration:run
pnpm --filter @purposemint/api dev

# Dashboard
pnpm --filter @purposemint/dashboard dev

# Mobile
cd apps\mobile
pnpm exec expo run:android
```

Full setup, including Android toolchain and EAS configuration, is in
[`docs/mobile/expo-native-guide.md`](docs/mobile/expo-native-guide.md).

---

## Architecture, in one page

**The API owns every business decision.** No frontend — mobile or dashboard —
decides whether a user has passed verification, whether a subscription is active,
whether a transfer is allowed, or whether premium content is unlocked. Those are
NestJS guards, services, and database queries. A frontend that hides a button is
not enforcing anything; the backend enforces it, or it isn't enforced.

**`packages/contracts` is the only shared code.** Request/response shapes, Zod
schemas, and enums live there and are imported by name (`@purposemint/contracts`)
from all three apps. No app ever imports another app's source files. TypeORM
entities, NestJS internals, React components, and Next.js server code never enter
this package — it stays platform-neutral so it's safe to import into web, mobile,
and backend code alike.

**Every schema change is a migration.** `synchronize: true` is never used outside
a throwaway local experiment. Generate migrations with
`migration:generate`, read them before running them, and never hand-edit a
migration that's already been applied in any shared environment.

**Financial and identity provider integration (Plaid, Synctera, Stripe) lives
entirely in the API.** Secrets never leave `apps/api`. Mobile receives only
normalized PurposeMint responses and public keys where a provider SDK genuinely
requires one client-side. Webhook handling is idempotent by design — providers
retry, and duplicate delivery must never double-process a financial event.

The full rule set — dependency placement, environment variable conventions,
security/privacy rules, deployment — is in
[`docs/architecture/monorepo-rules.md`](docs/architecture/monorepo-rules.md).
Read it before your first PR that touches more than one app.

---

## Do this / Don't do this

| Do | Don't |
|---|---|
| `pnpm --filter @purposemint/<app> add <pkg>` | Install an app-specific library at the repo root |
| Import shared types from `@purposemint/contracts` | Redefine a request/response shape locally in an app |
| Generate migrations, read them, then run them | Hand-write a migration against a schema you haven't diffed |
| Enforce every rule server-side, mirror it in the UI for UX | Trust a disabled button as the actual security boundary |
| Keep `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*` genuinely public | Put a secret, key, or credential behind a public-prefixed env var |
| Test against provider sandboxes before going live | Assume a payment or bank-connection succeeded because the client said so |

---

## Where things stand

This section is maintained by whoever ships the next phase — keep it current
rather than aspirational.

**Built and working end to end:** authentication (register → verify email →
session, refresh rotation with reuse detection, password reset, logout/logout-all),
onboarding (values → goal → habits), the mobile dashboard, Goals and Habits
management, Reflections and the Journal tab, the Pathways flow (savings
verification is currently self-attested, not bank-verified), membership tiers and
the pricing screen (no payment processor wired up yet — upgrades record intent
only), the Profile tab, and an internal admin dashboard covering users, pathway
application review, and upgrade-intent reporting.

**Deliberately not built yet:**

- **Real bank verification.** Pathways savings are self-reported today. Which
  provider handles this (Plaid direct, or Quiltt in front of MX/Finicity) is an
  open business decision, not a technical blocker.
- **Payment processing.** `upgrade_intents` capture demand; no Stripe integration
  exists, and no code path changes a user's `tier`.
- **Voice reflections.** The data model and UI account for them; recording,
  upload, and playback are not implemented — no AWS storage is configured yet.
- **Push notifications.** Preferences are a stored shell; nothing dispatches.
- **Partner content management.** Pathway partners are seeded, and several are
  invented placeholders pending real partner relationships. No admin CRUD exists
  for them yet.
- **Automated tests.** There is currently no test suite. This is the single
  biggest risk in the codebase — the areas most worth covering first are refresh
  token rotation, concurrent savings/habit mutations, and streak calculation
  across timezones, since those are exactly where review has previously found
  real bugs.

**Known technical debt:** several mobile screens have grown large (500-700+
lines) across rapid feature phases and would benefit from a deliberate
refactor — do that only with test coverage in place first, not before, since
refactoring untested working code is how you reintroduce bugs that were already
fixed once.

---

## Style and branding

Visual identity — colors, typography, iconography, logo usage — follows
[`docs/brand/PurposeMint_Brand_Book.pdf`](docs/brand/PurposeMint_Brand_Book.pdf).
Dashboard styling conventions (Tailwind, semantic tokens, component patterns) are
in [`docs/dashboard/tailwind-guide.md`](docs/dashboard/tailwind-guide.md). The
product name in-app is always **PurposeMint**; "Mint To Prosper Foundation" is
reserved for legal/parent-entity contexts.

---

## Contributing / how to move forward

1. Read `docs/architecture/monorepo-rules.md` before touching more than one app.
2. Any schema change ships as a generated migration, reviewed before it runs.
3. Any new request or response shape goes in `packages/contracts`, imported by
   name — never redefined locally in an app.
4. Run type-checks for every workspace you touched before calling something
   done:
   ```powershell
   pnpm --filter @purposemint/api check-types
   pnpm --filter @purposemint/dashboard check-types
   pnpm --filter @purposemint/mobile exec tsc --noEmit
   ```
   A change that "should compile" and a change that's been verified to compile
   are not the same thing — this repo has shipped bugs that only surfaced when
   someone finally ran the type-checker.
5. Prefer small, reviewable phases over one large change — the app's whole build
   history has gone phase by phase, with a report and a verification step
   between each one, and that pattern has caught real bugs before they reached
   users.
