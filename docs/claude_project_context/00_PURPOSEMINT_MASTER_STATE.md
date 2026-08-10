# PurposeMint — Master State

**Owner:** Saad Sohail (solo freelance full-stack / cloud engineer, Karachi)
**Last updated:** 29 July 2026
**Status:** Pre-Phase-1. Monorepo scaffolded; local Android native build not yet green.

This is the anchor document for the PurposeMint Claude Project. When any two documents in
this project disagree, **this file's Source of Truth Precedence section decides**, and the
disagreement should be raised rather than silently resolved.

---

## 1. What PurposeMint Is

A values-led financial wellness and behaviour-change mobile product for underserved users.
Not a budgeting app. The core loop is:

```text
values -> goals -> micro-habits -> daily completion -> reflection -> progress -> optional premium support
```

Product tone is fixed and non-negotiable: warm, affirming, beginner-friendly,
trauma-informed, culturally relevant, non-judgemental. No shame-based mechanics, no
jargon, no aggressive notification behaviour.

---

## 2. Source of Truth Precedence

Read top-down. Higher entries override lower ones.

| Rank | Source | Governs |
| --- | --- | --- |
| 1 | `00_PURPOSEMINT_MASTER_STATE.md` (this file) | Current status, blockers, unresolved decisions |
| 2 | `02_PURPOSEMINT_MONOREPO_RULES.md` | Repo architecture, dependency rules, security, deployment |
| 3 | `05_PURPOSEMINT_DESIGN_TOKENS.md` | Colour, typography, tone, component direction |
| 4 | `03_PURPOSEMINT_TAILWIND_GUIDE.md` | Dashboard web styling only |
| 5 | `04_PURPOSEMINT_BUILD_RUNBOOK.md` | Local Windows/Expo/native build procedure |
| 6 | `01_PURPOSEMINT_PRODUCT_ROADMAP.md` | Phase sequencing, scope, deliverables, client-facing plan |

The roadmap ranks last **on technical questions only** because it is a client-facing
document at v1.1 and parts of its stack section have been overtaken by later decisions.
It remains authoritative for scope, phase ordering, deliverables and exit criteria.

---

## 3. UNRESOLVED — Financial Stack Contradiction

**This must be closed before Phase 3 planning. Do not assume an answer.**

Three sources describe three different financial architectures:

| Source | Payments | Identity / KYC | Banking | Coaching |
| --- | --- | --- | --- | --- |
| Roadmap v1.1 (docx, 28 Jun 2026) | Stripe | none in MVP | Phase 7 only (Plaid/Yodlee) | not mentioned |
| Roadmap visuals (PNG set) | Subscription/plan state | **Plaid KYC in onboarding** | **Synctera** | **KiroMoney AI Coach** |
| `02_PURPOSEMINT_MONOREPO_RULES.md` | **Stripe** | **Plaid** | **Synctera** | not mentioned |

The monorepo rules are the most recent and most likely correct: **Stripe for subscriptions,
Plaid for KYC/identity at onboarding, Synctera for banking and money movement.** The
visuals also introduce **KiroMoney AI Coach**, which appears in no written specification at
all — no module definition, no data model beyond four table names, no scope boundary.

### Open questions

1. Is Plaid MVP scope (Phase 3) or post-MVP (Phase 7)? The visuals say MVP; the roadmap text says post-MVP.
2. If Synctera is in MVP, the roadmap's 14–26 week estimate is understated. Embedded banking adds compliance, contract and support scope that Phase 0 explicitly gated.
3. What is KiroMoney? Own model, wrapper over a provider, or scripted rules? Which phase? Who owns the content and its safety review?
4. Does the roadmap's Phase 7 "Future FinTech Integrations" still exist as a distinct phase, or has Plaid/Synctera been pulled forward into it?

Until these are answered, treat the roadmap phase table as scope-accurate and the
visuals as direction-only.

---

## 4. Stack

| Layer | Choice |
| --- | --- |
| Mobile | React Native via Expo SDK 57, RN 0.86, React 19.2.3, Expo Router, expo-dev-client |
| Dashboard | Next.js (internal admin/ops), Tailwind CSS |
| Backend | NestJS, REST, OpenAPI/Swagger |
| ORM | TypeORM (migrations only — never `synchronize: true` outside local) |
| Database | PostgreSQL on Amazon RDS |
| Cloud | AWS — VPC, ECS Fargate preferred, RDS, S3, Secrets Manager/SSM, CloudWatch |
| Payments | Stripe (hosted checkout + customer portal) |
| Identity/KYC | Plaid — *phase unconfirmed, see §3* |
| Banking | Synctera — *phase unconfirmed, see §3* |
| Push | Amazon SNS + APNs/FCM |
| Repo | pnpm workspaces + Turborepo, single `pnpm-lock.yaml` |
| CI | GitHub Actions |

Expo Go is **not** a supported runtime. Development builds only.

---

## 5. Repository

Local path: `C:\PM` — deliberately short. **Do not move it.** See `04_..._BUILD_RUNBOOK.md`.

```text
C:\PM
├── apps
│   ├── api          @purposemint/api          NestJS
│   ├── dashboard    @purposemint/dashboard    Next.js admin
│   └── mobile       @purposemint/mobile       Expo React Native
├── packages
│   ├── contracts            @purposemint/contracts
│   ├── eslint-config        @purposemint/eslint-config
│   └── typescript-config    @purposemint/typescript-config
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── turbo.json
```

Root package name: `purposemint-platform`. Android package: `com.purposemint.app`.

### Settled repository decisions — do not reopen

- pnpm is the only package manager. No npm, no yarn, no second lockfile.
- `nodeLinker: hoisted` in `pnpm-workspace.yaml` — required for React Native native builds.
- No `virtualStoreDir` override. It was tried, it helped partially, it was removed.
- Repo stays at `C:\PM`.
- Monorepo (not split repos). Justification: React Native + shared TypeScript contracts.
- Tailwind is dashboard-only. Mobile uses React Native StyleSheet + shared tokens.
- No `packages/ui` and no `packages/tailwind-config` while dashboard is the only web app.

---

## 6. Local Environment

```text
OS         Windows
Node       22.17.1        (Expo SDK 57 needs >= 22.13)
Java       OpenJDK 17.0.19
pnpm       10.34.5
Android    SDK + platform-tools installed, ADB working
Device     ZY22F4PXXG (physical, USB debugging authorised)
CMake      3.22.1 (Android SDK bundled)
Ninja      1.10.2  <-- TOO OLD, needs >= 1.12.0
```

---

## 7. Current Status

### Done

- Monorepo scaffolded with all three apps and three shared packages.
- Repo relocated to `C:\PM` to shorten native build paths.
- Migrated pnpm from isolated to hoisted linker; hoisting verified for `react-native-worklets`.
- Android toolchain confirmed working end-to-end up to native C++ compilation.
- Root cause of native build failure diagnosed (long paths + outdated Ninja).

### Blocked

**Expo CLI will not resolve.** `pnpm exec expo prebuild` fails with
`Cannot find module 'C:\PM\apps\mobile\node_modules\expo\bin\cli'`. Most likely a stale
workspace-level `node_modules/.bin` shim left over from the isolated-linker install.
Fix is a full multi-level `node_modules` wipe plus `pnpm install --force`.
Procedure: `04_PURPOSEMINT_BUILD_RUNBOOK.md` §3.

### Next actions, in order

1. Full `node_modules` wipe at root + every app + every package; `pnpm install --force`.
2. Verify Expo resolves and `expo --version` runs.
3. `expo install --fix`, then `expo-doctor`.
4. `expo prebuild --clean --platform android`.
5. Replace bundled Ninja 1.10.2 with 1.12.0+.
6. Clear `.cxx` and `.gradle` caches, then `expo run:android --device`.
7. Separately: investigate the `apps/api` bin-link warning for `@types/node`.

### Not yet proven

- First successful local Android development build
- First EAS preview APK
- First production AAB
- Any backend module beyond skeleton
- Any database migration

---

## 8. Known Secondary Issues

| Issue | Impact | Notes |
| --- | --- | --- |
| `apps/api` bin-link warning: pnpm tries to link `node` from `@types/node/node.exe` | Cosmetic so far; install completes | Suspect a bad `"node": "npm:@types/node@..."` alias or stale `.bin`. Check manifests before removing anything. |
| Gradle deprecation warning (incompatible with Gradle 10) | None now | Revisit at next Expo/RN/AGP upgrade, not before. |
| `allowBuilds` denies `sharp` and `unrs-resolver` | Unknown | Unrelated to the path issue. Review after a clean install, per app. |

---

## 9. Scope Guardrails

MVP **does not** include, unless explicitly approved and funded:

- Open banking transaction sync, payroll (Argyle), credit attributes (Equifax)
- Macro/reference data feeds, news/education feeds
- FDIC-insured account functionality
- Voice-note reflections (text + mood scale is enough)
- Community moderation and coaching operations

Pricing tiers: Free $0 / Growth $19 / Elevate $49 per month. Entitlement is **always**
backend-enforced. A client-side tier flag never unlocks anything.

---

## 10. Glossary

| Term | Meaning |
| --- | --- |
| PurposeMap™ | Output of the values quiz — maps selected values to suggested goals and habit templates |
| Micro-win | A single completed habit action; the core reinforcement unit |
| Values quiz | Onboarding step producing `user_values` rows, versioned by `quiz_version` |
| Entitlement | Backend-owned record of what a user may access, derived from subscription state |
| KiroMoney | AI coaching layer named in the visuals; **undefined scope**, see §3 |
| PM | Shorthand for the repo root `C:\PM` |
