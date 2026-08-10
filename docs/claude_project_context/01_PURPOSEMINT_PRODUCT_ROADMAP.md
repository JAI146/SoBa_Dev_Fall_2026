# PurposeMint — Product Roadmap & Build Plan

**Source:** `PurposeMint_Product_Roadmap_with_User_Journey.docx`, v1.1, generated 28 June 2026.
**Converted to markdown** for project context. The docx remains the client-facing artifact.

> **Precedence note.** This document is authoritative for **scope, phase ordering,
> deliverables and exit criteria**. It is *not* authoritative on the financial stack —
> see `00_PURPOSEMINT_MASTER_STATE.md` §3 for the unresolved Stripe / Plaid / Synctera /
> KiroMoney contradiction. Sections below marked ⚠ are affected.

---

## 1. Roadmap Purpose & Sources

Controlling technical direction is `PurposeMint_Technical_Prospectus_Proposal_Updated.docx`.
Older no-code/prototype documents are product-flow and design references only.

| Priority | Document | Role |
| --- | --- | --- |
| Primary | Technical Prospectus Proposal (Updated, docx) | Architecture, timeline, stack, modules, DB, security, QA, store plan |
| Reference | Prototype Development & Alignment Document (pdf) | Original no-code MVP user journeys |
| Reference | Screen Design Draft / Product Content Reference | Tone, pricing tiers, real-life goals, pain points |
| Reference | Data Requirements (pdf) | Future partner needs: open banking, payroll, credit, macro, education feeds |
| Superseded | Technical Prospectus Proposal (pdf) | Earlier version |

---

## 2. Product Vision & MVP Definition

Values-led financial wellness and behaviour change — not a budgeting app. Helps
underserved users connect values, realistic goals, daily habits, reflection, encouragement
and premium support into one mobile-first journey.

| Area | Interpretation |
| --- | --- |
| Mission | Align goals, values and daily habits through literacy, personal development, behaviour change, culturally relevant design |
| Tone | Warm, affirming, minimal, beginner-friendly, trauma-informed, non-judgemental |
| Core need | Users feel overwhelmed, excluded or judged by traditional finance tools |
| Core value | Turn values into realistic savings and habit goals; reinforce via micro-actions, reflection, badges, supportive nudges |

### MVP includes

- Secure account creation, login, reset or passwordless, onboarding status, profile
- Values quiz and PurposeMap™ output mapping values → suggested goals and habits
- Goal templates, custom goals, real-life savings categories, habit setup, completion tracking, streaks, progress bars
- Reflection/journaling with mood score, history, emotionally intelligent prompts, dashboard summaries
- Badges: first goal set, habit completions, streak milestones, challenge milestones, premium achievements
- Pricing screen for Free / Growth / Elevate, subscription flow, backend entitlement enforcement
- Premium content visibility: downloads, reports, challenge board, coaching links, gated tools
- Push preferences, device registration, reminder nudges, quiet hours, badge notices, delivery logs
- Admin dashboard: metrics, subscription states, support workflows, audit logs, notification visibility
- Store-ready Android and iOS builds, privacy disclosures, account deletion/export, release docs

### MVP excludes unless confirmed

- Open banking, payroll, credit, macro/reference and news feeds — requires partner contracts, consent flow, compliance, retention rules ⚠
- FDIC-insured account functionality — requires finalised banking partner and product rules ⚠
- Voice-note reflections — text + mood scale is sufficient for MVP
- Advanced coaching/community operations — requires content, moderation, scheduling, admin workflows

---

## 3. Technical Stack

Architecture principle: keep mobile client, backend API, database, payments,
notifications, admin and future data partners separated.

| Layer | Technology | Responsibility |
| --- | --- | --- |
| Mobile | React Native | Cross-platform app, design system, secure storage, navigation, push tokens, store builds |
| Backend | NestJS | REST APIs, auth, profile, PurposeMap, goals, habits, journaling, subscriptions, notifications, admin, provider adapters |
| ORM | TypeORM | Entities, repositories, migrations, transactions, seeds |
| Database | PostgreSQL on RDS | System of record |
| Cloud | AWS | VPC, compute, RDS, S3, Secrets Manager/SSM, CloudWatch, CI/CD, optional CloudFront/WAF |
| Payments | Stripe | Checkout, portal, plans, invoices, webhooks, entitlements, audit trail |
| Push | Amazon SNS + APNs/FCM | Endpoints, reminders, nudges, badge unlocks, delivery logs |
| Distribution | Play Store + App Store | Signing, metadata, privacy, review, staged rollout |

### Build order

1. Repositories and branch strategy
2. AWS dev/staging foundation: networking, secrets, logs, RDS, compute target, pipeline
3. NestJS skeleton: modules, config, validation, OpenAPI, logging, error handling, health checks
4. PostgreSQL schema — users/auth first, then values/goals/habits/reflections/badges/subscriptions/notifications/admin logs
5. React Native shell: navigation, env config, design system, components, secure storage, API client
6. Auth and profile **before** core product modules
7. Core MVP in journey order: onboarding → PurposeMap → goals → habits → reflections → dashboard → badges
8. Monetisation and engagement: entitlements, premium gating, push, admin visibility
9. QA, security hardening, release builds, privacy/legal, store prep, staged launch

---

## 4. Roadmap at a Glance

| Phase | Timing | Focus | Outcome |
| --- | --- | --- | --- |
| 0 | Weeks 1–2 | Discovery & Finalisation | Requirements, design screens (no API), pricing, payment approach, compliance assumptions, release scope |
| 1 | Weeks 3–5 | Foundations | Repos, CI/CD, AWS base, NestJS skeleton, DB schema, auth foundation, RN setup |
| 2 | Weeks 6–11 | Core User MVP | Onboarding, PurposeMap, goals, habits, progress, journaling, dashboard, badges, profile |
| 3 | Weeks 12–14 | Payments & Premium Access ⚠ | Checkout, portal, webhooks, entitlements, premium gating, payment audit logs |
| 4 | Weeks 15–17 | Notifications & Engagement | SNS, device tokens, preferences, nudges, badge notifications, quiet hours |
| 5 | Weeks 18–21 | Admin & Analytics | Admin dashboard, metrics, support workflows, payment/notification visibility, audit logs |
| 6 | Weeks 22–26 | QA, Security & Store Readiness | Testing, accessibility, performance, hardening, release builds, store submission |
| 7 | Post-MVP | Future FinTech Integrations ⚠ | Plaid/Yodlee, Argyle, Equifax, macro/reference, education feeds via adapters |

Effort distribution across the ~21-week average: P0 1.5wk (7%), P1 2.5wk (12%),
P2 5.0wk (24%), P3 2.5wk (12%), P4 2.5wk (12%), P5 3.0wk (14%), P6 4.0wk (19%).

### Release milestones

| Milestone | Window | Definition |
| --- | --- | --- |
| Internal Alpha | End P2 / early P3 | Core journey works on test devices with seeded data |
| Private Beta | End P4 | Core journey, test-mode payments, premium gating, push all work in staging for a closed group |
| Release Candidate | End P6 | Production-like build passes QA, store metadata ready, privacy/legal complete, monitoring and rollback prepared |
| Public Launch | After store approval | Staged rollout with crash monitoring, support process, analytics review, triage |

---

## 5. Phases in Detail

### Phase 0 — Discovery & Finalisation | 1–2 weeks

**Objective:** convert proposal, design direction, prototype flow and data requirements
into final build requirements and a locked MVP backlog before engineering starts.

- **Product scope** — confirm MVP screens, user stories, priorities, boundaries. Map no-code prototype flows into production modules without carrying Glide/Airtable/Zapier forward. Confirm Free/Growth/Elevate benefits and entitlement rules. Define MVP vs post-MVP for banking, payroll, credit, macro, news.
- **Design** — finalise screens for onboarding, values quiz, PurposeMap, goals, habits, dashboard, reflections, pricing, premium, notifications, settings, admin basics — screen design only, no API integration. Lock visual direction: mint/cream/lavender/coral accents, rounded components, clear typography, trauma-informed messaging. Create empty/loading/error states and accessible copy.
- **Technical decisions** — auth method (email/password, passwordless, hybrid). Hosting (ECS Fargate recommended). Mobile payment approach vs Apple/Google rules. Stripe products/prices, trial/coupon logic, cancellation rules, portal needs.
- **Compliance/ops** — privacy policy, terms, export/deletion expectations, consent language. Confirm ownership of AWS, Apple Developer, Play Console, Stripe, APNs/FCM, support email. Risk log for financial-data integrations and store subscription review.

**Exit gate:** no major screen or feature ambiguity; pricing and entitlement rules approved;
payment approach understood; team agrees first release excludes advanced data integrations
unless separately approved.

**Risks:** design screens must be final before RN development accelerates. If subscriptions
unlock digital-only content, store payment rules may affect a Stripe-only flow. Pulling
open banking or payroll into MVP expands timeline and compliance scope.

---

### Phase 1 — Foundations | 2–3 weeks

**Objective:** build the base every later feature depends on.

- **Repos & CI/CD** — backend, mobile and docs repos or a structured monorepo. Branch strategy, PR checks, lint, format, unit test and build commands, env templates. GitHub Actions for lint, tests, Docker image build, migrations policy, staging deploy.
- **AWS foundation** — dev/staging/prod separation. VPC, subnets, security groups, RDS PostgreSQL, Secrets Manager or SSM, CloudWatch logs and alarms, storage buckets. ECS Fargate preferred.
- **Backend foundation** — NestJS with modular structure, config module, env validation, API versioning, health check, Swagger, global validation pipes, logging, exception filters, rate limiting, CORS allowlist. TypeORM connection, migration and seed workflow, repositories, base service patterns.
- **Database foundation** — users, auth/session/refresh tokens, roles, profile, onboarding status, audit logs. Entity patterns prepared for `user_values`, `goal_templates`, `user_goals`, `habit_templates`, `user_habits`, `habit_completions`, `reflections`, `badges`, `subscriptions`, `payment_events`, `notification_devices`, `notification_logs`. Indexes on userId, status fields, goalId, completion dates, payment event IDs, admin audit lookups.
- **Mobile foundation** — RN shell with navigation, env config, component library, typography, spacing, rounded cards, accessible buttons, API client. Secure token storage via iOS Keychain and Android Keystore. Dev/staging API switching, base error/loading/empty states.
- **Auth foundation** — auth module skeleton, register/login endpoints, JWT or secure session strategy, refresh-token rotation design, password reset and verification design, RBAC. Screens: welcome, sign up, login, forgot password, verification, first-run profile shell.

**Exit gate:** backend deploys to staging; mobile connects to staging API; initial
migrations run and roll back safely in development; auth foundation ready for Phase 2.

**Risk:** AWS access, payment test keys, Apple/Google accounts and APNs/FCM prerequisites
should be available early.

---

### Phase 2 — Core User MVP | 4–6 weeks

**Objective:** the complete non-paid journey from account creation to badges. This is the
heart of the product.

- **Auth & profile** — account creation, login, refresh/session handling, logout, reset or passwordless, verification, protected routes. Profile, onboarding status, tier field, notification preference shell, deletion/export placeholders, settings screen.
- **Onboarding & values quiz** — welcome flow, consent notices, beginner education, values quiz, selected-values review, completion tracking. Store in `user_values` with quiz version and source metadata.
- **PurposeMap™** — map values to goal suggestions and habit templates. Display personalised blueprint of values, suggested goals, first micro-actions. Editable selections.
- **Goals** — templates for real-life savings and support goals: emergency cushion, groceries, back-to-school supplies, therapy session fund, bill buffer, self-care, kids birthday fund, custom. Create/edit/archive, target amount, due date, category, current progress, status.
- **Habits & micro-wins** — habit templates and user habits tied to goals. Daily/weekly checklist, status, schedule/frequency, completion records, streak logic, progress percentage, lightweight history. Micro-win copy that celebrates progress without shaming missed days.
- **Reflections & mood** — journal prompt, text reflection, mood scale, history, privacy-aware storage, dashboard mood trend. Data model prepared for optional future voice notes without blocking MVP.
- **Dashboard** — active goals, savings/progress bars, completed habits, badges, mood trend, encouraging nudges. Loading, empty and beginner-friendly explanation states.
- **Badges** — catalogue and trigger rules: first goal set, 3 habits completed, 7-day streak, challenge milestones. `user_badges` with unlock timestamp and metadata; in-app confirmation states.
- **QA in-phase** — unit tests for calculation logic, badge rules, streaks, goal progress, validations, core services. Mobile testing across device sizes and poor network.

**Exit gate:** a new user can register, complete onboarding, see PurposeMap™, select a
goal, create habits, complete habits, see progress, journal, earn a badge, return to the
dashboard. Data persisted with user-specific authorisation. No paid access granted
client-side; tier stays backend-controlled.

**Risk:** design screen changes during this phase expand the timeline, because core screens
are implemented here.

---

### Phase 3 — Payments & Premium Access | 2–3 weeks ⚠

> The visuals reframe this phase as "Plaid + Synctera". The written roadmap describes it as
> Stripe-only. Unresolved — see `00_PURPOSEMINT_MASTER_STATE.md` §3.

**Objective:** monetisation, subscription lifecycle, tier entitlements, premium content
visibility, billing support views.

- **Stripe setup** — products/prices for Free, Growth, Elevate. Checkout sessions, success/cancel return flow, customer portal, staging webhooks. Stripe-hosted collection so no raw card data touches PurposeMint servers.
- **Backend billing module** — subscription module with Stripe customer ID, subscription ID, plan, status, current period end, cancellation/renewal state, entitlement mapping. Verify every webhook signature. Process webhooks idempotently through `payment_events`, guarding duplicates and out-of-order events.
- **Mobile upgrade flow** — pricing comparison screen, upgrade CTA, checkout redirect/webview handling, return/deep-link validation, entitlement-aware UI states. Plan status, manage-billing link, upgrade/downgrade messaging, friendly errors.
- **Premium access** — gate planner downloads, premium reports, challenge board, group coaching links, partner discounts, advanced tools on **backend** entitlements. Never trust a mobile tier flag.
- **Admin/payment visibility** — subscription and failed-payment state exposed to admin. Payment audit logs and reconciliation checks for webhook failures.

**Exit gate:** users upgrade in staging and see backend-confirmed entitlement changes;
duplicate webhooks do not double-process; free users cannot reach premium endpoints or
screens.

**Risk:** Apple/Google payment policy must be confirmed before store submission if
subscriptions unlock digital-only content.

---

### Phase 4 — Notifications & Engagement | 2–3 weeks

**Objective:** push infrastructure and user-controlled reminders supporting habit
consistency, badge celebration, subscription messaging and non-shaming engagement.

- **Mobile push setup** — APNs/FCM config for both platforms. Permission request with clear supportive wording. Register platform token and send to backend.
- **Amazon SNS backend** — create/update platform endpoints. Store endpoint ARN and hashed device token in `notification_devices`. Handle disabled endpoints, token refresh, platform differences, delivery failures.
- **Preferences & quiet hours** — preference screen supporting opt-out, reminder categories, habit reminder times, quiet hours, relevance checks before sending.
- **Templates** — habit reminder, badge unlock, payment notice, weekly summary, gentle re-engagement. Warm, short, culturally aware, non-judgemental. No bulk or junky behaviour.
- **Delivery logging** — type, status, sent time, provider message ID, failure reason, retry/disable decision, preference enforcement.

**Exit gate:** test devices receive staging notifications reliably; quiet hours and opt-outs
respected; delivery events logged and failures diagnosable.

---

### Phase 5 — Admin & Analytics | 2–4 weeks

**Objective:** operational visibility and support workflows.

- **Admin auth & access** — admin role, protected endpoints or secured internal dashboard. Separate permissions; log every sensitive action.
- **Metrics** — total users, users by tier, onboarding completion, active goals, completed habits, badge unlock rate, reflection count, average mood trend, notification engagement. Filters for date range, tier, onboarding status, activity.
- **Support tools** — find user by email; review account/profile/onboarding, subscription, failed payment and notification delivery state. Resend verification or trigger support-safe workflows where approved.
- **Content management** — manage or seed goal templates, habit templates, reflection prompts, badge definitions, premium content links. Destructive edits restricted or migration-backed.
- **Audit logs** — action, entity type, entity ID, timestamp, admin user ID, outcome.

**Exit gate:** admins review product health without direct database access; sensitive
actions restricted and audited; metrics match backend data.

**Risk:** admin scope grows quickly — keep the launch version to operational essentials.

---

### Phase 6 — QA, Security & Store Readiness | 3–5 weeks

- **Functional QA** — signup, login, verification/reset, onboarding, PurposeMap, goal creation, habit completion, badge unlock, reflection, dashboard, upgrade, premium access, notifications, admin support. Regression checklist per release candidate.
- **Backend/API QA** — unit tests for services, validators, repositories, calculations, badge rules, entitlements. Integration tests for auth, TypeORM, payment webhook simulation, SNS token registration, admin actions. OpenAPI review.
- **Mobile QA** — Android and iOS devices, responsiveness, navigation, secure storage, deep links, offline/poor network, release builds. Strip debug logs, confirm env separation, validate release config.
- **Security hardening** — HTTPS/TLS, security headers, CORS allowlists, request validation, rate limiting, JWT/session security, password hashing, RBAC, secrets management, logging without sensitive data. Webhook verification, secure DB access, RDS private subnet, encryption at rest and in transit, backup/restore, dependency scans, rollback strategy.
- **Accessibility** — text size, contrast, screen reader labels, tap targets, readable consent screens, understandable errors, non-shaming copy.
- **Store readiness** — signed AAB and iOS archive/TestFlight build. Metadata, screenshots, privacy policy URL, terms, account deletion process, data-use declarations, subscription explanation, notification permission wording, staged rollout plan.
- **Production ops** — production AWS/RDS/payments/SNS/APNs/FCM, CloudWatch alarms, incident checklist, crash monitoring, release notes, hotfix/rollback.

**Exit gate:** critical and high-severity defects closed or explicitly accepted; payment,
notification, auth, deletion/export, privacy and admin flows pass release QA; production
configured, monitored, backed up; store assets and privacy declarations ready.

**Risk:** app review timelines are outside engineering control. Subscription policy issues
may require changes before approval.

---

### Phase 7 — Future FinTech Integrations | Post-MVP ⚠

- **Open banking** — Plaid or Yodlee for accounts, transactions, balances, categorisation, goal tracking, spending insights, potential micro-save logic. Explicit consent, token management, data minimisation, unlinking, deletion logic.
- **Payroll/income** — Argyle for pay cycle detection, paycheck-linked saving rules, employer challenges, income-aware recommendations.
- **Credit attributes** — Equifax or similar for lightweight wellness signals, avoiding lending positioning.
- **Macro/reference** — Nasdaq Data Link, S&P or FactSet for contextual education.
- **News & education** — AP, MT Newswires, Dow Jones or curated feeds.
- **Adapter architecture** — every provider isolated behind an adapter so providers can be swapped without touching core logic.

**Gate:** do not start production financial-data integrations until legal/compliance,
partner contracts and data handling rules are clear.

---

## 6. User Journey → Build Sequence

Lead with trust and real-life relevance, then move: values → goal → micro-habits →
dashboard progress → reflection/recap → optional premium support.

### Screen-by-screen

| Step | Moment | Build meaning |
| --- | --- | --- |
| 01 | Discover PurposeMint (landing page) | Marketing CTA routes cleanly into demo/signup; copy stays warm and beginner-friendly |
| 02 | Welcome + name entry | Onboarding start state, profile basics, consent language, first-run routing |
| 03 | Choose values (Progress, Balance, Stability, Confidence, Family First) | Store multiple values in `user_values` with quiz versioning and validation |
| 04 | Receive PurposeMap™ | Map values to `goal_templates`, `habit_templates`, partner pathways |
| 05 | Build micro-habits (Transfer Tuesday, Mood Check-In, no-spend days, shopping lists) | `user_habits`, schedule/frequency, completion records, plan summary, supportive copy |
| 06 | Daily dashboard | Aggregate goals, habits, completions, badges, mood trend, recent reflections, gated tools |
| 07 | Month in Review | Monthly summary calculations, badge history, mood analytics, share CTA, recap copy |
| 08 | Unlock support & pathways | Entitlements, premium gating, notifications, admin visibility, future partners |

### Engineering sequence with dependencies

| # | User moment | Build items | Depends on |
| --- | --- | --- | --- |
| 1 | Open app / welcome | Navigation, design system, welcome screen, CTA routing | App shell only |
| 2 | Create account / login | Auth screens, Auth Module, Users Module, token storage, verification/reset | — |
| 3 | Profile + consent | Profile fields, onboarding status, consent notices, notification preference shell | Auth + Users |
| 4 | Values quiz | Selection screens, validation, `user_values`, quiz versioning | Logged-in user, onboarding state |
| 5 | PurposeMap™ | Map values to goals and habits, display blueprint | Values + goal templates |
| 6 | Goal setup | Templates, custom goals, target/due/status, `user_goals` | PurposeMap or manual entry |
| 7 | Habit setup | Templates, `user_habits`, schedule/frequency, micro-actions | A selected goal |
| 8 | Micro-win tracking | Completion records, streaks, progress calculations, supportive messages | Habits + completion model |
| 9 | Reflection / mood | Prompt, mood score, history, privacy-aware storage | Parallel after auth/profile |
| 10 | Dashboard | Progress bars, active goals, completed habits, badges, mood trend, nudges | Goals, habits, reflections, badges |
| 11 | Badges | Rules, unlock events, achievements screen | Goals/habits/completions |
| 12 | Upgrade / premium | Pricing, checkout, entitlements, gating | Auth + tier model |
| 13 | Notifications | Device tokens, SNS endpoints, reminders, quiet hours, logs | Authenticated device + preferences |
| 14 | Admin | Metrics, support tools, subscription status, notification logs, audit trail | Reliable production data |

**First vertical slice for sprint planning:**
`Welcome → Values → PurposeMap™ → One Goal → Two Habits → Dashboard`.
Only after that works end-to-end with persisted data: reflection history, badges, monthly
recap, premium gating, notifications, admin visibility, future integrations.

---

## 7. Backend Module Roadmap

| Module | Phase | Responsibilities | Acceptance focus |
| --- | --- | --- | --- |
| Auth | 1–2 | Login strategy, JWT/session, refresh tokens, RBAC, reset, verification, future social login | Protected routes work; tokens refresh securely; role checks block unauthorised access |
| Users | 1–2 | Profile, onboarding status, tier, notification preferences, deletion/export | Data isolated by userId; profile and onboarding update reliably |
| PurposeMap | 2 | Values quiz storage, value profile, recommended goals, templates, onboarding logic | Selected values produce repeatable suggestions |
| Goals | 2 | CRUD/archive, custom goals, targets, due dates, tags, progress | CRUD and progress calculations tested and secure |
| Habits | 2 | Templates, user habits, completions, streaks, schedule/frequency | Completion history and streaks calculate correctly |
| Reflections | 2 | Entries, mood scores, prompts, history, privacy rules | Users see only their own; admin access restricted |
| Badges | 2 | Definitions, rules, unlock events, assignments, triggers | Unlocks idempotent and logged |
| Subscription | 3 | Customers, checkout, entitlements, webhook verification, renewal/cancellation, audit | Webhook simulation passes; paid access only via verified events |
| Notifications | 4 | Tokens, SNS endpoints, scheduling, templates, preferences, logs | Opt-outs and quiet hours enforced |
| Admin | 5 | Login, metrics, tier counts, reflection counts, badge rates, support tools | Admin role required; actions audited |
| Integrations | 7 | Plaid/Yodlee, Argyle, Equifax, Nasdaq, AP/Dow Jones via isolated adapters ⚠ | Adapters added without changing core flows |

---

## 8. Database & Data Model

Normalise around users, goals, habits, reflections, subscriptions, badges, notification
records. Minimise sensitive financial data, encrypt where appropriate, store only what is
required.

| Area | Tables | Phase |
| --- | --- | --- |
| Foundation | `users`, auth/session/refresh tokens, `roles`, `admin_audit_logs` | 1 |
| Onboarding | `user_values`, onboarding status, `quiz_version` | 2 |
| Goals | `goal_templates`, `user_goals` | 2 |
| Habits | `habit_templates`, `user_habits`, `habit_completions` | 2 |
| Reflections | `reflections`, reflection prompts | 2 |
| Badges | `badges`, `user_badges` | 2 |
| Payments | `subscriptions`, `payment_events` | 3 |
| Notifications | `notification_devices`, `notification_logs` | 4 |
| Admin analytics | Read models / reporting queries | 5 |
| Future data | Provider connections, account metadata, transaction summaries, income signals, education feed items ⚠ | 7 |

**Implementation notes.** TypeORM migrations for every schema change; no destructive
migration without backup and rollback plan. Index userId, status fields, subscription
status, goalId, habit completion dates, payment event IDs. Keep raw banking credentials out
of the database — store provider tokens or references only, encrypted. Separate credentials
for runtime, migrations and read-only analytics where practical. RDS automated backups,
PITR, maintenance windows, CloudWatch alarms, private networking.

> The visuals add a seventh data group — **KiroMoney AI Coach**: `coach_sessions`,
> `coach_prompts`, `recommendation_logs`, `user_feedback` — and a Synctera group:
> `banking_profile`, `account_records`, `payment_events`, `service_status`, `entitlements`.
> Neither appears in the written roadmap. Treat as unspecified. ⚠

---

## 9. Payments & Premium

| Step | Phase | Detail | Completion signal |
| --- | --- | --- | --- |
| Decision checkpoint | 0 | Confirm tier rules, store payment policy, product setup, cancellation/renewal | Approved pricing and payment decision note |
| Data foundation | 1 | `users.tier`, `subscriptions`, `payment_events`, entitlement model | Backend represents a plan without trusting the client |
| Checkout | 3 | Checkout sessions, customer creation, success/cancel handling, deep-link validation | Users can start checkout in staging |
| Webhooks | 3 | Signature verification, idempotent events, subscription state, renewals/cancellations/failures | Test events update entitlements correctly |
| Premium gating | 3 | Backend-protected premium APIs, mobile premium UI states | Free users blocked, paid users allowed |
| Admin visibility | 5 | Subscription and failed-payment state, basic support data | Support reviews status without provider-dashboard dependence |
| Release checks | 6 | Test cards, failures, cancellation, renewal, webhook retry, production keys, store requirements | Payment checklist passes |

**Policy risk.** Confirm before final App Store submission whether Stripe alone is
acceptable for the exact paid offering. If subscriptions unlock digital-only content,
in-app purchase rules may apply. Close in Phase 0, recheck in Phase 6.

---

## 10. Notifications & Engagement

| Area | Phase | Detail | Acceptance |
| --- | --- | --- | --- |
| Permission strategy | 0–4 | Why notifications matter, frequency, trust-respecting copy | Short, supportive copy approved |
| Device registration | 4 | APNs/FCM token → backend stores hashed token + SNS endpoint ARN | Token refresh and multiple devices handled |
| Preferences | 4 | Categories, quiet hours, opt-out, frequency, channels | Backend checks preferences before sending |
| Templates | 4 | Habit reminder, badge unlock, weekly summary, subscription notice, re-engagement | Concise and non-shaming |
| Delivery logs | 4–5 | Status, sentAt, provider ID, failure reason, disabled endpoint handling | Admin can diagnose delivery issues |
| Release QA | 6 | Android/iOS push, background/foreground, opt-out, permission-denied behaviour | Push works in release builds |

---

## 11. Design & Content

| Area | Use | Phase |
| --- | --- | --- |
| Brand tone | Warm, affirming, non-judgemental, culturally relevant, clear, encouraging | 0–2 |
| Design system | Typography, spacing, buttons, cards, forms, progress bars, badges, charts, empty/error states | 1 |
| User pain points | No emergency savings, paycheck-to-paycheck stress, financial trauma, jargon overwhelm, distrust of traditional tools | 0–2 |
| Journey content | Open account, set real-life goals, automate, track visually, pause without shame, celebrate small wins | 2 |
| Pricing tiers | Free $0/mo, Growth $19/mo, Elevate $49/mo with benefit comparison and clear upgrade CTA | 3 |
| Real-life goal library | Fresh haircut fund, back-to-school supplies, groceries, bill buffer, therapy session fund, kids birthday fund, self-care, coffee joy runs | 2 |
| Focus-group insight | Users want a tool that understands real life, is not culturally irrelevant, and does not send junky notifications | 0–4 |

---

## 12. QA, Security & Release Gates

| Area | Coverage | Must pass |
| --- | --- | --- |
| Unit | Services, validators, repositories, calculations, badge rules, entitlements | Every PR and Phase 6 regression |
| Integration | Auth, TypeORM, payment webhook simulation, SNS registration, admin ops | Staging sign-off and RC |
| Mobile | Devices, responsiveness, poor network, secure storage, deep links, push | Alpha, beta, RC |
| E2E | Onboarding → PurposeMap → goal → habit completion → badge → upgrade | Before private beta and launch |
| Security | Rate limits, API validation, token handling, RBAC, webhook forgery, secrets, dependency scanning | Before production launch |
| Performance | API response times, dashboard load, query performance, notification dispatch, scaling | Before launch and after major changes |
| Accessibility | Contrast, text size, screen reader labels, tap targets, consent screens, non-shaming copy | Design sign-off and Phase 6 |
| Store | AAB, iOS archive, signing, metadata, screenshots, privacy disclosures, staged rollout | Phase 6 release gate |

### Security gates by area

| Area | Gate |
| --- | --- |
| Backend/API | HTTPS, validation pipes, strict DTOs, rate limiting, CORS allowlist, security headers, safe errors, short token expiry or secure sessions, refresh rotation, RBAC |
| Database | RDS private subnet, encryption at rest and in transit, least-privilege credentials, backups, migration safety, indexes, audit logs |
| Mobile | Secure storage, no hard-coded secrets, release obfuscation where practical, deep-link validation, screenshot protection if account details are added |
| Payments | Hosted or official SDK flows, webhook signatures, idempotency, backend-only entitlement updates, separate dev/staging/prod keys |
| Cloud/DevOps | IAM least privilege, MFA, secrets in AWS services, separate environments, CI tests and scans, rollback strategy, CloudWatch alarms |

---

## 13. MVP Deliverables

React Native app (Android + iOS) · NestJS API with OpenAPI docs · PostgreSQL schema with
migrations, indexes, seeds, backup plan · AWS deployment with hosting, RDS, networking,
secrets, logs, monitoring, alarms · Payment integration with checkout, portal, webhooks,
entitlement logic, test checklist · Push notification system · Admin dashboard · Deployment
package with store artifacts, release notes, metadata guidance, staging/production guide.

---

## 14. Client Decisions Needed Before Build Lock

1. Finalise all MVP design screens; no major additions during Phase 2.
2. Confirm login approach: email/password, passwordless, or hybrid.
3. Approve Free/Growth/Elevate benefits, prices, trials, discounts, cancellation and downgrade rules.
4. Confirm Stripe-only vs app-store in-app purchase requirement for subscriptions.
5. Confirm whether open banking, payroll, credit, macro/reference and education feeds are post-MVP or MVP. ⚠
6. Provide AWS, Stripe, Apple Developer, Play Console, APNs/FCM and domain/DNS access.
7. Approve privacy policy, terms, deletion/export process, support email, store data-use declarations.
8. Approve notification categories, quiet-hour defaults, frequency limits, sample copy.
9. Confirm admin users, roles, support workflows, and what data admins may view.
10. Confirm launch region, target devices, accessibility expectations, analytics/crash tools, beta group.

**Additional, from `00_PURPOSEMINT_MASTER_STATE.md` §3:** confirm the Plaid / Synctera /
KiroMoney scope and phase placement. ⚠

---

## 15. Sprint Structure

| Sprint | Weeks | Focus |
| --- | --- | --- |
| 0 | 1–2 | Discovery, requirements, backlog, acceptance criteria, design freeze, payment decision |
| 1 | 3 | Repos, CI/CD, NestJS skeleton, RN shell, AWS/RDS planning |
| 2 | 4 | Migrations, auth backend, auth screens, profile model, design system components |
| 3 | 5 | Auth completion, secure storage, environment switching, onboarding shell |
| 4 | 6–7 | Values quiz, PurposeMap™, goal templates, suggestion logic |
| 5 | 8–9 | Goal setup, habit setup, completion, progress and streak logic |
| 6 | 10–11 | Reflections, mood, dashboard, badges, internal alpha stabilisation |
| 7 | 12–14 | Checkout, portal, webhooks, entitlements, premium gating |
| 8 | 15–17 | SNS, push tokens, preferences, reminder templates, quiet hours, logs |
| 9 | 18–21 | Admin dashboard, metrics, support workflows, audit logs, reporting |
| 10 | 22–26 | Full QA, security hardening, release builds, store metadata, launch readiness |

---

## Appendix A — MVP Checklist

- [ ] Account creation and secure login
- [ ] Password reset or passwordless recovery
- [ ] Email or equivalent account verification
- [ ] User profile and onboarding status
- [ ] Values quiz and PurposeMap™ display
- [ ] Goal templates and custom goal creation
- [ ] Habit setup and completion tracking
- [ ] Progress bar and dashboard
- [ ] Reflection entry and mood score
- [ ] Badge unlock system
- [ ] Plan upgrade flow
- [ ] Backend entitlement rules
- [ ] Premium content visibility rules
- [ ] Push registration and reminders
- [ ] Notification preferences and quiet hours
- [ ] Admin metrics dashboard
- [ ] Audit logs for admin/payment/subscription actions
- [ ] Store-ready Android and iOS builds
- [ ] Privacy policy, terms, account deletion/export

---

## Appendix B — Environment Separation

| Environment | Purpose |
| --- | --- |
| Development | Local machines, mock providers, local/staging database, non-production keys, debugging enabled |
| Staging | AWS-hosted, staging RDS, test-mode payments, SNS sandbox/test devices, QA builds, seeded data |
| Production | Production AWS, RDS backups, production keys, production SNS/APNs/FCM, release builds, monitoring and alarms |

---

## Appendix C — Content of the Roadmap Visuals

The 11 presentation graphics are captured here as text so they do not need to be uploaded.

**Creative Roadmap Dashboard** — 14–26 weeks to production MVP, 7 phases, P0–P6 production,
P7 post-MVP growth. Five build pillars: mobile app, backend API, cloud & data, financial
layer, coaching layer.

**Phase Timing Gantt** — P0 W1–2, P1 W3–5, P2 W6–11 (Internal Alpha), P3 W12–14,
P4 W15–17 (Private Beta), P5 W18–21, P6 W22–26 (RC / Launch).

**Production System Architecture Map** — three columns. *Mobile Experience:* RN app, user
screens, premium UI. *Backend & Core Logic:* NestJS REST API, TypeORM + business rules,
Plaid onboarding layer, OpenAPI + QA surface. *Cloud + Financial Services:* AWS foundation,
PostgreSQL/RDS, Synctera, Amazon SNS + APNs/FCM, KiroMoney AI Coach, future data adapters. ⚠

**End-to-End User Journey Flow** — 14 moments: open app, create account, Plaid KYC,
profile + consent, values quiz, PurposeMap, goal setup, habit setup, micro-win, reflection,
dashboard, Synctera services, KiroMoney AI Coach, admin. Four principles: identity first;
core behaviour loop; financial services after trust; coach with context. ⚠

**Backend Module Roadmap Heatmap** — build/QA grid across P1–P7 for Auth, Users, Plaid KYC,
PurposeMap, Goals, Habits, Reflections, Badges, Synctera Banking, Entitlements,
Notifications, KiroMoney, Admin, Integrations. P6 is QA across all launch-critical modules. ⚠

**Database & Data Model Visual Map** — seven groups around `USERS`: identity & audit,
onboarding & values, Plaid KYC, core product, Synctera services, engagement,
KiroMoney AI Coach. ⚠

**Synctera, Premium & Entitlement Flow** — pricing screen → Plaid KYC → Synctera services →
verified events → subscription/plan state → entitlement service → premium experience. Four
pre-launch controls: policy check, event safety, access control, admin visibility. ⚠

**Notifications engine** — "non-shaming engagement engine": permission copy, device token,
admin review, delivery logs, SNS, templates, preferences, KiroMoney coach. Design
principle: notifications should feel like encouragement, not pressure.

**QA, Security & Release Gates** — Internal Alpha → Private Beta → Release Candidate →
Public Launch, with six gate groups: functional QA, API & integration QA, mobile QA,
security, accessibility, store readiness.

**Phase Planning Chart** — effort distribution (see §4) and duration ranges per phase.

**UI Visual Direction** — see `05_PURPOSEMINT_DESIGN_TOKENS.md`.
