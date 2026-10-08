# Subscription and plan management implementation plan

## Goal

Provide a self-contained admin workspace for database-backed, configurable plans and user subscriptions, using the existing NestJS, TypeORM, PostgreSQL, Zod, and dashboard components. Add no libraries. Do not edit the mobile app.

## Ownership and integration

- Add shared request/response schemas in `packages/contracts/src/subscription-management.ts`, with one export in `index.ts`.
- Keep API administration, queries, validation, and subscription transitions in a dedicated `apps/api/src/subscription-management/` module.
- Extend the existing plan entity rather than introducing a competing plan catalog. Add subscription, billing, and append-only history entities under `apps/api/src/entities/`, and a generated migration under `apps/api/src/database/migrations/`.
- Keep dashboard tabs, editors, tables, and styles in `apps/dashboard/features/subscription-management/`, mounted by a thin `/dashboard/subscriptions` route.
- Limit shared changes to module registration, navigation, audit action constants, the existing membership contract/catalog adapter, seed behavior, and the capability checks required to consume configured entitlements.

## Plan configuration

Support arbitrary stable plan keys and editable name, description, display copy, monthly/yearly prices and supported billing cycles, active/inactive status, display order, availability windows, promotional prices and their validity windows, supported feature selection, entitlement values, and applicable usage limits.

Expose a supported capability catalog through the API. Validate entitlement types and limits centrally; reject unsupported capability identifiers. Existing plan names are seed data, never conditional business logic. Existing seeded plans must not overwrite administrator changes on application startup.

## Subscription and billing separation

Store a user's subscription separately from their legacy tier field. Track current plan, lifecycle status, billing cycle, start and renewal dates, cancellation state, payment status, and billing failures. Store agreed billing amounts independently of the mutable plan catalog so changing catalog prices does not retroactively change existing charges.

Record every assignment, plan change, cycle change, and cancellation in append-only subscription history with previous/new plan, effective date, action, and authenticated administrator. Serialize transitions in database transactions and commit the audit event in the same transaction. Preserve canceled subscriptions and historical billing records. Do not offer hard deletion of plans.

Make timing rules explicit in the admin UI and API. Support immediate changes and changes at renewal without silently rewriting dates or past charges. Resolve current entitlements through the API and integrate existing supported capability gates; do not implement payment collection or claim that recorded payment state confirms a provider transaction.

## Authorization

The attached dashboard guide describes a permission system absent from this checkout: there is no `permissions.ts`, `RequirePermission`, or `PermissionsGuard`, and `super_admin` is the only defined admin role. Follow the existing incentives feature's fail-closed super-admin policy for this feature rather than introducing a general access-control system. Keep that policy isolated for a later permissions-system merge. Enforce access on every administration endpoint and audit sensitive changes.

## Verification

1. Build contracts, type-check and lint both changed apps, build the dashboard, and run API tests.
2. Test contract rejection of unsupported capabilities, invalid prices/cycles/promotions, and invalid transitions.
3. Test authorization, transactional audit/history, concurrent transitions, cancellation retention, and non-retroactive pricing.
4. Generate and inspect the migration, apply it to a local development database if available, and verify configuration survives reload/restart.
5. Exercise plan creation/editing/activation, customer assignment, upgrades/downgrades, monthly/yearly switching, subscription details/history, and narrow-screen/loading/empty/error states in the dashboard.
6. Report actual check results and any unavailable environment-dependent verification.

## Required go-ahead

Section 2.3 of the attached `C:/Users/levin/Downloads/AGENTS.md` requires a go-ahead for contracts, API, migrations, or auth. The user approved this plan before implementation. The implementation also configures a default free plan for new customers and checks the selected plan version before assignments or changes, so concurrent price edits cannot silently change the agreed offer.
