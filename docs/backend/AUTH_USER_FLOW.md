# Claude Code Task — PurposeMint API: Auth + Users module

## Operating rules — read first

- **Do not run `pnpm build`, `nest build`, `pnpm lint`, `eslint`, or `check-types`.** They are slow. Write code that is correct by inspection instead.
- **Do not run migrations or connect to the database.** I will run `migration:generate` and `migration:run` myself.
- Working directory is `C:\PM`. This is a pnpm + Turborepo monorepo. The API workspace is `@purposemint/api` at `C:\PM\apps\api`.
- Install dependencies into the workspace that uses them: `pnpm --filter @purposemint/api add <pkg>`. Never into the root manifest.
- Windows / PowerShell. Backtick line continuation, not backslash.
- **Audit before you write.** Much of `apps/api` was copied from a previous project. Read every existing file in `src/auth`, `src/entities`, `src/common`, `src/database`, `src/mail`, `src/storage`, `src/health`, `src/app.module.ts`, `src/main.ts`, and `scripts/` before changing anything. Report what is wrong, what is leftover, and what you are deleting — then make the change. Do not preserve broken code out of caution.
- Run `rg -n -i "muakhah|@muakhah|visitor" apps/api` and remove every leftover.
- Where a decision is genuinely ambiguous, make the call and write a one-line rationale in your summary. Do not stop and ask about small things. **Do** stop and ask about anything in "Out of scope — ask, don't guess" below.

---

## Context

PurposeMint is a values-led financial wellness mobile product. Stack: NestJS + TypeORM + PostgreSQL, Expo React Native mobile app, Next.js internal dashboard, shared `@purposemint/contracts` package.

Architectural rules that are not negotiable:

- All authoritative business rules live in `apps/api`. Frontends never decide entitlement, verification status, or access.
- `@purposemint/contracts` is platform-neutral: Zod schemas, inferred types, enums, pagination and error contracts. **No** TypeORM entities, **no** NestJS decorators, **no** React, **no** provider SDK clients.
- Apps never import from another app's source.
- TypeORM migrations for every schema change. `synchronize: false` everywhere, including local.
- Secrets never go in `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*`.

Product voice applies to **every** user-facing string, including validation errors and email copy: warm, affirming, plain language, no shame, no jargon, no pressure, no urgency framing. "That email and password don't match up — you can reset your password if you need to." Not "Invalid credentials."

---

## 1. Session and token model

Implement short-lived access JWT + rotating opaque refresh token. The refresh row **is** the session.

**Access token**
- JWT, HS256, TTL 15 minutes (config: `JWT_ACCESS_TTL`).
- Payload: `{ sub: userId, sid: sessionId, userType, adminRole }`. Nothing else. No email, no tier.
- Separate secret from the refresh signing material (`JWT_ACCESS_SECRET`).

**Refresh token**
- 32 bytes from `crypto.randomBytes`, base64url. **Not** a JWT.
- Stored SHA-256 hashed in `user_sessions`. Plaintext is returned to the client once and never persisted.
- TTL 30 days for mobile clients, 7 days for the dashboard (config-driven, client type sent at login).
- Rotated on every `/auth/refresh`: mark the old row `rotatedAt`, insert a new row in the same `familyId`.
- **Reuse detection:** if a token whose `rotatedAt` is already set is presented, revoke the whole `familyId`, write an audit event, and return a generic 401.

**Delivery**
- Dashboard client: refresh token in an httpOnly + Secure + SameSite=Lax cookie scoped to `path=/api/auth/refresh`. Requires `cookie-parser`.
- Mobile client: refresh token in the response body. The mobile app stores it in `expo-secure-store`.
- Access token always in the response body, sent as `Authorization: Bearer`.

**JwtStrategy.validate** loads the user by primary key on every request and rejects `suspended` or soft-deleted users. Do not trust the payload alone. This is a deliberate choice — immediate revocation beats saving one indexed lookup. Attach a lean principal, not the raw entity.

---

## 2. Entity work

The current `User` entity is a carry-over. Fix it, do not extend it blindly.

**Fix on `users`:**

- `UserTypeEnum.USER` value is `'visitor'` — change to `'customer'`. Do this now, before the first migration; renaming a Postgres enum value later needs hand-written SQL.
- `status` currently defaults to `ACTIVE` while `PENDING_EMAIL` exists. Default must be `PENDING_EMAIL`.
- Add `select: false` to `passwordHash`. Login must `addSelect` explicitly.
- **Remove** `emailOtpHash`, `emailOtpExpiresAt`, `passwordResetOtpHash`, `passwordResetOtpExpiresAt`. They move to `user_otps`.
- Add: `emailVerifiedAt` (timestamptz, null), `onboardingStatus` (enum `not_started | in_progress | completed`, default `not_started`), `tier` (enum `free | growth | elevate`, default `free`), `lastLoginAt` (timestamptz, null), `deletedAt` (timestamptz, null, use `@DeleteDateColumn`).
- Keep `notificationPreferences` and `policyAgreements` as jsonb for now, but type them via contracts rather than `Record<string, boolean>` / `Record<string, string>`.
- Index: unique on `email` (lowercased on write), index on `status`, index on `deletedAt`.

`tier` is written **only** by the subscription module in Phase 3 and is never read for an authorization decision. Add a comment saying so.

**New entities in `src/entities`:**

`user_sessions` — `id`, `userId` (FK, indexed, cascade delete), `familyId` (uuid, indexed), `tokenHash` (varchar, unique, `select: false`), `clientType` (enum `mobile | dashboard`), `userAgent`, `ipAddress`, `expiresAt`, `rotatedAt` (null), `revokedAt` (null), `revokedReason` (null), `createdAt`.

`user_otps` — `id`, `userId` (FK, indexed), `type` (enum `email_verification | password_reset`), `codeHash` (`select: false`), `expiresAt`, `attempts` (int, default 0), `consumedAt` (null), `createdAt`. Composite index on `(userId, type, consumedAt)`.

`audit_events` — `id`, `actorUserId` (null for system), `actorType` (enum `user | admin | system`), `action` (varchar), `entityType`, `entityId`, `outcome` (enum `success | failure`), `metadata` (jsonb, must never contain secrets, tokens, OTP codes or password material), `ipAddress`, `createdAt` indexed.

Enums live in `@purposemint/contracts` and are imported by the entities, not defined in the entity files. Contracts stays platform-neutral — plain TS enums or const objects are fine there.

---

## 3. Module layout

```
apps/api/src/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts            register, login, verify, reset, change password
    session.service.ts         issue / rotate / revoke refresh sessions
    token.service.ts           sign and verify access JWTs
    otp.service.ts             generate, hash, verify, rate-limit OTPs
    strategies/jwt.strategy.ts
    guards/jwt-auth.guard.ts
    guards/roles.guard.ts
    guards/verified-email.guard.ts
    decorators/public.decorator.ts
    decorators/current-user.decorator.ts
    decorators/roles.decorator.ts
  users/
    users.module.ts
    users.controller.ts
    users.service.ts
  common/
    pipes/zod-validation.pipe.ts
    filters/all-exceptions.filter.ts
    interceptors/audit.interceptor.ts        (optional; explicit service calls are fine)
    mappers/user.mapper.ts
  database/
    data-source.ts
    migrations/
  entities/
  config/
    env.validation.ts
```

Keep `src/entities` flat — it keeps the migration data-source glob simple and avoids circular imports for cross-module relations. Modules register with `TypeOrmModule.forFeature`.

**Dependency direction:** `auth` depends on `UsersService`. `users` imports only auth's guards and decorators, never its services. No circular imports.

Controllers stay thin — validation, delegate, map response. No business logic, no repository access.

---

## 4. Endpoints

**Auth** (`/api/auth`) — all `@Public()` except where noted:

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/register` | creates user `pending_email`, issues verification OTP, returns tokens |
| POST | `/verify-email` | consumes OTP, sets `emailVerifiedAt`, status → `active` |
| POST | `/resend-verification` | 60s cooldown per user |
| POST | `/login` | |
| POST | `/refresh` | rotation + reuse detection |
| POST | `/logout` | authenticated; revokes current session only |
| POST | `/logout-all` | authenticated; revokes every session for the user |
| POST | `/forgot-password` | always 200, regardless of whether the email exists |
| POST | `/reset-password` | consumes OTP, revokes all sessions |
| POST | `/change-password` | authenticated; requires current password, revokes all other sessions |

**Users** (`/api/users`) — all authenticated:

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/me` | |
| PATCH | `/me` | name, country, state, city |
| PATCH | `/me/notification-preferences` | |
| POST | `/me/policy-agreements` | records document key + version + timestamp |
| POST | `/me/profile-image` | presigned S3 upload via the existing `storage` module |
| POST | `/me/deletion-request` | sets `deleteAccountRequestedAt`, audit event |
| DELETE | `/me/deletion-request` | cancels it |

Do **not** build admin user-management endpoints. That is Phase 5.

---

## 5. Security requirements

- Login returns the same generic response for unknown email and wrong password. When the user is not found, still run a bcrypt compare against a fixed dummy hash so timing does not leak existence.
- Emails normalised to lowercase and trimmed on write and on lookup.
- OTPs: 6 digits, bcrypt-hashed, 10-minute expiry, max 5 attempts, single-use, invalidate all prior unconsumed OTPs of the same type on issue.
- `@nestjs/throttler` globally, with tighter per-route limits on `/login`, `/register`, `/forgot-password`, `/resend-verification`, `/verify-email` — keyed on **both** IP and email.
- `helmet` in `main.ts`.
- Global `ZodValidationPipe` using schemas from `@purposemint/contracts`.
- Global exception filter producing the normalized error contract from `@purposemint/contracts`. Never leak stack traces, TypeORM driver errors, or constraint names.
- Never return an entity from a controller. Map explicitly. `passwordHash`, `tokenHash`, `codeHash` must be structurally impossible to serialise.
- Write audit events for: register, login success, login failure, email verified, password changed, password reset, logout-all, refresh reuse detected, deletion requested, deletion cancelled.
- Redact tokens, OTP codes and password material from all logs.
- `VerifiedEmailGuard` exists and is applied to nothing yet — a user with `pending_email` can still use the app. It is there for money movement, KYC and subscription routes later. Do not lock people out of onboarding.

---

## 6. Migrations

Create `apps/api/src/database/data-source.ts` exporting `dataSourceOptions` and a default `DataSource`. `TypeOrmModule.forRootAsync` in `app.module.ts` must consume the **same** options object so CLI and runtime cannot drift.

- `synchronize: false`, `migrationsRun: false` in every environment.
- Entities glob: `src/entities/*.entity{.ts,.js}`. Migrations glob: `src/database/migrations/*{.ts,.js}`.
- Add `dotenv` as an explicit dependency of `apps/api` and load it in `data-source.ts`.

Add to `apps/api/package.json` scripts:

```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
"migration:generate": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:generate",
"migration:create": "typeorm-ts-node-commonjs migration:create",
"migration:run": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:run",
"migration:revert": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:revert",
"migration:show": "typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show"
```

**Delete** `migrate:admin-rbac` and `migrate:password-reset` from the scripts block and delete `apps/api/scripts/migrate-admin-rbac.mjs` and `apps/api/scripts/migrate-password-reset-otp.mjs`. Ad-hoc `.mjs` migration scripts give no ordering and no history.

Do not write or generate any migration file. I will run `migration:generate` for `InitialSchema` against an empty database myself.

---

## 7. `main.ts` and bootstrap

Currently it only sets CORS, a global prefix and a port. Add:

- `helmet()`
- `cookieParser()`
- Global `ZodValidationPipe`
- Global exception filter
- `@nestjs/swagger` at `/api/docs`, disabled when `NODE_ENV === 'production'`
- `app.enableShutdownHooks()`
- Fail-fast env validation (Zod) before `NestFactory.create` — do not boot with a missing `JWT_ACCESS_SECRET` or `DATABASE_URL`
- Keep the existing CORS allowlist behaviour; add `credentials: true` (already present) and confirm the dashboard origin comes from config, not a hard-coded string

Update `apps/api/.env.example` with every new variable: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_ACCESS_TTL`, `REFRESH_TTL_DAYS_MOBILE`, `REFRESH_TTL_DAYS_DASHBOARD`, `OTP_TTL_MINUTES`, `OTP_MAX_ATTEMPTS`, `BCRYPT_ROUNDS`, `DASHBOARD_URL`, plus the existing mail and S3 variables. Placeholder values only.

---

## 8. Contracts package

Add to `packages/contracts` and import from both the API and (later) the clients:

- Enums: user type, user status, admin role, onboarding status, tier, client type, OTP type, audit outcome
- Zod schemas + inferred types for every request and response body listed in §4
- Notification-preferences and policy-agreements shapes
- The normalized API error contract and pagination contract, if they do not already exist

Check what is already in contracts before adding. Do not duplicate.

---

## 9. Dependencies to install

```powershell
cd C:\PM
pnpm --filter @purposemint/api add @nestjs/throttler @nestjs/swagger helmet cookie-parser dotenv
pnpm --filter @purposemint/api add -D @types/cookie-parser
```

Do **not** add `class-validator` or `class-transformer`. Validation is Zod-first via contracts. `zod` belongs in `packages/contracts`, not the root manifest.

---

## 10. Out of scope — ask, don't guess

- **No KYC fields on the user entity.** Whether Plaid identity verification sits in onboarding or in Phase 7 is an unresolved contradiction across the project docs. It is a cheap additive migration once decided. Do not add a column on a guess.
- No subscription, entitlement, Stripe or Synctera work.
- No admin dashboard endpoints.
- No values quiz, goals, habits, reflections or badges.
- No notification dispatch — only the preferences shell on the user record.

If any of the above appears necessary to complete the task, stop and tell me rather than building it.

---

## 11. Deliverable

When done, give me:

1. What you found in the existing code that was wrong or leftover, and what you deleted.
2. Files created, modified, deleted.
3. Any decision you made where the instructions were ambiguous, one line each.
4. The exact PowerShell commands I should run, in order, to generate and apply the initial migration and start the API.

No build. No lint. Clean, consistent, readable code.