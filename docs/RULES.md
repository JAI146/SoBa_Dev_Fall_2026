# Muakhah Monorepo Rules

## 1. Workspace Rules

This repository uses pnpm workspaces and Turborepo.

Deployable apps live in `apps/*`.
Shared libraries and tooling live in `packages/*`.

Apps must not import from other apps.
Apps may only import shared code from `packages/*`.

Allowed:
- apps/dashboard -> packages/contracts
- apps/api -> packages/contracts
- apps/landing -> packages/constants

Not allowed:
- apps/dashboard -> apps/api/src
- apps/landing -> apps/dashboard/src
- apps/mobile -> apps/dashboard/src

## 2. Dependency Rules

Install dependencies where they are used.

Examples:

Dashboard dependency:
`pnpm --filter @muakhah/dashboard add <package>`

API dependency:
`pnpm --filter @muakhah/api add <package>`

Mobile dependency:
`pnpm --filter @muakhah/mobile add <package>`

Root dependency only for repo tooling:
`pnpm add -D <package> -w`

Do not install app-specific dependencies in the root package.json.

## 3. Import Rules

Inside a Next.js app, `@/` means the current app only.

Allowed:
`import { Button } from "@/components/ui/button"`

Shared packages must be imported by package name:

`import { UserRole } from "@muakhah/contracts"`

Never use `@/` to import files from another app or package.

## 4. Dashboard Rules

Dashboard has three main shells:
- admin
- sponsor
- family

The sidebar must be generated from role-based navigation config.
Hiding sidebar links is not security.
Security must be enforced in:
- `proxy.ts`
- server components/actions
- API guards
- database queries

Sponsor family discovery, public family details, sponsor login/registration, and
new sponsorship requests live in `apps/landing`. Sponsor account management and
post-submission workflows remain in `apps/dashboard`.

The temporary cross-app session handoff may pass the existing JWT in a URL
fragment. Both apps must validate it through `GET /auth/me`, immediately remove
the fragment from browser history, and continue to rely on API guards for access
control.

## 5. Backend Rules

All business rules live in the API.

Frontend must not decide:
- whether a sponsor can view transfer details
- whether a family can edit a profile
- whether a message is approved
- whether coverage can exceed 100%

These decisions must be enforced by NestJS guards/services.

## 6. Database Rules

Use TypeORM with PostgreSQL.
Use migrations only.
Never use `synchronize: true` in staging or production.

TypeORM entities stay inside `apps/api`.
Frontend apps use DTOs/contracts, not database entities.

## 7. Privacy Rules

Never expose:
- full family names publicly
- phone numbers publicly
- detailed addresses publicly
- national IDs publicly
- receiving method details before sponsorship creation
- unapproved images/media

Receiving method details must be encrypted.
Protected files must use signed URLs or controlled API access.

## 8. Moderation Rules

All messages, images, videos, profile updates, and receiving method changes must go through moderation before delivery or publication.

Every moderation action must create a moderation log.
Every sensitive action must create an activity log.

## 9. Package Rules

Use `packages/contracts` for:
- enums
- DTOs
- Zod schemas
- API request/response types

Use `packages/constants` for:
- roles
- statuses
- route constants
- public platform constants

Use `packages/ui` only if components are truly shared by multiple web apps.

## 10. Deployment Rules

Each app is deployed independently.

Landing:
Root directory: `apps/landing`

Dashboard:
Root directory: `apps/dashboard`

API:
Deploy as backend service/container.

Mobile:
Build from `apps/mobile` using Expo/EAS.

Shared packages are not deployed independently.
They are bundled/linked into the apps that import them.
