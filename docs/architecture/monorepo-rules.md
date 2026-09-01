# PurposeMint Monorepo Rules

## 1. Repository Architecture

This repository uses **pnpm workspaces** and **Turborepo**.

Deployable applications live in `apps/*`.

```text
apps/
  api/          NestJS backend
  dashboard/    Next.js administration and operations dashboard
  mobile/       Expo React Native customer application
```

Shared libraries and repository tooling live in `packages/*`.

Recommended shared packages:

```text
packages/
  contracts/          Shared API contracts and platform-neutral schemas
  eslint-config/      Shared ESLint configuration
  typescript-config/  Shared TypeScript configuration
```

Applications must never import source files from another application.

Allowed:

```text
apps/dashboard -> packages/contracts
apps/mobile    -> packages/contracts
apps/api       -> packages/contracts
```

Not allowed:

```text
apps/dashboard -> apps/api/src
apps/mobile    -> apps/dashboard/src
apps/api       -> apps/mobile/src
```

Every application must remain independently buildable and deployable.

---

## 2. Package Naming

Use the `@purposemint/*` workspace scope.

Recommended names:

```text
Root repository:             purposemint-platform
apps/api:                    @purposemint/api
apps/dashboard:              @purposemint/dashboard
apps/mobile:                 @purposemint/mobile
packages/contracts:          @purposemint/contracts
packages/eslint-config:      @purposemint/eslint-config
packages/typescript-config:  @purposemint/typescript-config
```

Internal workspace dependencies must use:

```json
"@purposemint/contracts": "workspace:*"
```

---

## 3. Dependency Rules

Install dependencies in the workspace that uses them.

Dashboard dependency:

```bash
pnpm --filter @purposemint/dashboard add <package>
```

API dependency:

```bash
pnpm --filter @purposemint/api add <package>
```

Mobile dependency:

```bash
pnpm --filter @purposemint/mobile add <package>
```

Contracts dependency:

```bash
pnpm --filter @purposemint/contracts add <package>
```

Root dependencies are allowed only for repository-wide tooling:

```bash
pnpm add -D -w <package>
```

Examples of valid root tooling:

- Turborepo
- Prettier
- repository-wide lint-staged or commit tooling
- shared build scripts

Do not install application libraries such as NestJS, Next.js, Expo, TypeORM, Plaid, Stripe, React Hook Form, or mobile packages in the root `package.json`.

---

## 4. Package Manager and Lockfile Rules

This repository uses **pnpm only**.

The only dependency lockfile permitted is:

```text
pnpm-lock.yaml
```

Do not commit:

```text
package-lock.json
yarn.lock
npm-shrinkwrap.json
```

Do not add `package-lock=false` to `.npmrc`, because pnpm may interpret it as disabling lockfile use.

The root `package.json` must define the approved pnpm version through the `packageManager` field.

CI must fail when an unsupported lockfile is present.

---

## 5. Import Rules

Inside an application, local aliases refer only to that application.

Example inside `apps/dashboard`:

```ts
import { Button } from "@/components/ui/button";
```

Shared workspace code must be imported by package name:

```ts
import { UserRole, createGoalSchema } from "@purposemint/contracts";
```

Never use relative paths or `@/` aliases to cross an application or package boundary.

Not allowed:

```ts
import { UserEntity } from "../../api/src/users/user.entity";
import { Button } from "../../../packages/ui/src/button";
```

---

## 6. Purpose of `packages/contracts`

Keep `packages/contracts`.

PurposeMint has three consumers of the same backend API:

- Dashboard
- Mobile application
- API implementation/tests

The package prevents request, response, enum, and validation definitions from drifting between them.

Use it for:

- API request and response types
- Zod schemas
- public enums and statuses
- pagination contracts
- normalized API error contracts
- authentication response contracts
- goal, habit, reflection, subscription, banking, and notification contracts

Do not place these items in `packages/contracts`:

- TypeORM entities
- NestJS controllers, services, guards, or decorators
- provider secrets or SDK clients
- Node-only file-system utilities
- React components
- React Native components
- Next.js server actions
- database repositories

Contracts must remain platform-neutral and safe to import into web, mobile, and backend code.

---

## 7. Dashboard Rules

`apps/dashboard` is the internal administration and operations interface.

It may include:

- user support
- onboarding and KYC status visibility
- account and banking status visibility
- subscription and entitlement management
- notification history
- content or challenge management
- operational metrics
- audit-event visibility

Navigation may be role-aware, but hiding links is not security.

Authorization must be enforced in:

- Next.js route protection
- server components and server actions
- NestJS guards and services
- database queries

The dashboard must never independently approve a financial operation merely because a button is visible.

---

## 8. Mobile Rules

`apps/mobile` is an Expo React Native application.

Use:

- Expo development builds
- `expo-dev-client`
- Prebuild/config plugins for native configuration
- EAS Build when convenient
- local Android builds when needed

Expo Go is not the supported runtime after adding native integrations such as Plaid, Stripe wallet support, custom push configuration, or native banking SDKs.

Mobile dependencies must be installed inside `apps/mobile`.

EAS files belong inside the mobile app:

```text
apps/mobile/eas.json
apps/mobile/app.config.ts
```

Never import web UI components into the mobile app.

Never put backend secrets in:

```text
EXPO_PUBLIC_*
```

The mobile app may contain only public configuration such as the public API base URL or a public Stripe publishable key.

---

## 9. Backend Ownership

All authoritative business rules live in `apps/api`.

Frontend applications must not decide:

- whether a user has passed KYC
- whether a Synctera account is active
- whether a transfer or withdrawal is allowed
- whether a Plaid connection is valid
- whether a subscription is active
- whether premium content is unlocked
- whether a provider webhook is trusted
- whether a user may access another user's financial information

These decisions must be enforced by NestJS guards, services, policies, and database queries.

The backend must expose normalized PurposeMint domain responses rather than leaking raw provider payloads throughout the applications.

---

## 10. Financial Integration Rules

### Plaid

- Create Link tokens through the API.
- Exchange public tokens through the API.
- Keep Plaid secrets server-side.
- Store only the minimum required provider identifiers.
- Handle pending, failed, retry, expired, and revoked states.

### Synctera

- Keep all Synctera credentials server-side.
- Perform privileged customer, account, card, and money-movement operations through the API.
- Verify and process Synctera webhooks idempotently.
- Do not expose full raw provider objects to the mobile app.

### Stripe

- Keep secret keys and webhook secrets in the API.
- Verify webhook signatures.
- Treat webhook processing as idempotent.
- Store normalized subscription and entitlement state.
- Use the mobile publishable key only where needed.
- Do not rely on client-side payment success as the source of truth.

### General provider rules

- Use idempotency keys for retried financial operations.
- Redact secrets, tokens, account numbers, and sensitive identity information from logs.
- Store provider request IDs for operational debugging.
- Implement timeouts, retries, circuit-breaking, and failure-state handling where appropriate.

---

## 11. Database Rules

Use PostgreSQL with TypeORM.

Use migrations for every schema change.

Never use:

```ts
synchronize: true
```

in staging or production.

TypeORM entities, repositories, migrations, and database configuration must remain inside `apps/api`.

Frontend applications must use API contracts, not database entities.

Use transactions for operations that update multiple financial or entitlement records.

Use explicit indexes and unique constraints for provider IDs, webhook event IDs, and idempotency keys.

---

## 12. Security and Privacy Rules

Never expose or log:

- Plaid access tokens
- Synctera credentials
- Stripe secret keys
- complete account or routing numbers
- full identity-verification payloads
- national identification values
- access or refresh tokens
- authentication codes
- sensitive journal or reflection content without authorization

Use secure server-side secret storage.

Use secure mobile storage for session credentials.

Use signed URLs or controlled API access for protected files.

Every sensitive financial or administrative action must create an audit event.

Authorization must always use the authenticated user and backend-owned resource relationships.

---

## 13. Environment Variable Rules

Maintain separate environment templates for each deployable application.

Recommended files:

```text
apps/api/.env.example
apps/dashboard/.env.example
apps/mobile/.env.example
```

Backend secrets belong only in the API environment.

`NEXT_PUBLIC_*` and `EXPO_PUBLIC_*` variables are public and must never contain secrets.

Validate required API environment variables during backend startup.

Use distinct development, staging, and production credentials.

---

## 14. Testing Rules

At minimum, maintain:

- unit tests for domain services
- integration tests for database and provider adapters
- authorization tests
- webhook signature and idempotency tests
- contract validation tests
- dashboard smoke tests
- mobile critical-flow tests

Financial integrations must be tested against provider sandbox environments before production activation.

Tests must cover provider retries and failure states, not only successful flows.

---

## 15. Deployment Rules

Each application is deployed independently.

Dashboard:

```text
Root directory: apps/dashboard
```

API:

```text
Deploy as an independent backend service or container.
```

Mobile:

```text
Build from apps/mobile through Expo/EAS or local native tooling.
```

Shared packages are not deployed independently. They are linked or bundled into applications that import them.

Every deployment must use the correct environment and must not reuse development credentials in production.

---

## 16. Cleanup Rules

Delete a package only after confirming that no workspace imports or root scripts reference it.

After package removal:

```bash
pnpm install
pnpm lint
pnpm check-types
pnpm build
```

Search for stale Muakhah names and imports:

```bash
rg -n -i "muakhah|@muakhah" .
```

No Muakhah-specific business rules, environment variables, package names, deployment names, cookies, or provider identifiers may remain in PurposeMint.
