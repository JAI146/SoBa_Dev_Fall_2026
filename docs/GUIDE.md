Yes — for your project, **Turborepo + pnpm workspaces is the right choice**. You do **not** need Nx right now.

Your project is mainly JavaScript/TypeScript apps:

* `apps/landing` → Next.js public website
* `apps/dashboard` → Next.js dashboard for admin / sponsor / family
* `apps/api` → NestJS backend
* `apps/mobile` → Expo React Native app, but your MVP doc currently lists mobile apps as out of scope / later phase, so I would keep this ready but not make it P0 unless scope changed. 

Turborepo is designed as a lightweight high-performance build system for JS/TS monorepos. Nx is stronger when you need heavier platform features like advanced generators, distributed CI, polyglot builds, strict graph governance, and enterprise-scale controls. For your current stack, Turbo is cleaner and simpler. ([Turborepo][1])

---

## 1. The screenshot structure is not legacy

The screenshot is the official Turborepo examples table. The structure with:

```txt
apps/
packages/
turbo.json
pnpm-workspace.yaml
package.json
```

is the normal/native monorepo workspace structure, not legacy. Turborepo officially recommends splitting deployable apps/services into `apps/` and shared libraries/tooling into `packages/`. ([Turborepo][2])

The examples mean:

* **Basic**: two Next.js apps.
* **Kitchen sink**: multiple frameworks, frontend + backend.
* **TailwindCSS**: multiple Next.js apps sharing a Tailwind UI library. ([Turborepo][3])

For your real project, I would **not start with Kitchen sink**. It is useful for learning, but it may add unnecessary structure. Start with:

```bash
pnpm dlx create-turbo@latest muakhah-platform
```

Then rename/add apps manually. If you want a shared shadcn/ui package from day one, shadcn also has a monorepo setup that creates `web` + `ui` with Turborepo, but for your 4-app architecture, I would still start with `create-turbo` and add only what you need. ([Turborepo][4])

---

## 2. Recommended final monorepo structure

```txt
muakhah-platform/
├── apps/
│   ├── landing/                     # Next.js public website
│   ├── dashboard/                   # Next.js role-based dashboard
│   ├── api/                         # NestJS backend API
│   └── mobile/                      # Expo app, likely P2 unless scope changes
│
├── packages/
│   ├── contracts/                   # Shared DTOs, Zod schemas, enums, API types
│   ├── constants/                   # Roles, statuses, route names, public constants
│   ├── utils/                       # Pure shared helpers only
│   ├── typescript-config/           # Shared tsconfig presets
│   ├── eslint-config/               # Shared lint config
│   ├── tailwind-config/             # Optional shared Tailwind preset
│   └── ui/                          # Optional shared UI primitives/design system
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── RULES.md
│   ├── API_CONTRACTS.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   └── DEPLOYMENT.md
│
├── tooling/
│   └── scripts/
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .gitignore
├── .env.example
└── README.md
```

Your `pnpm-workspace.yaml` should be:

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

This is the standard pnpm workspace declaration style; pnpm uses this file to define which folders belong to the workspace. ([pnpm][5])

---

## 3. What goes in `apps/landing`

The landing app handles public-facing screens plus the sponsor onboarding and
new-sponsorship entry flow. Sponsor management remains in the dashboard:

```txt
apps/landing/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                         # Homepage
│   │   ├── how-it-works/
│   │   │   └── page.tsx
│   │   ├── families/
│   │   │   ├── page.tsx                     # Browse families
│   │   │   └── [publicCode]/
│   │   │       └── page.tsx                 # Public family details
│   │   ├── transparency/
│   │   │   └── page.tsx
│   │   ├── faqs/
│   │   │   └── page.tsx
│   │   └── policies/
│   │       ├── terms/
│   │       ├── privacy/
│   │       ├── communication/
│   │       ├── media/
│   │       └── direct-sponsorship/
│   │
│   ├── components/
│   │   ├── layout/
│   │   ├── home/
│   │   ├── families/
│   │   ├── transparency/
│   │   └── shared/
│   │
│   ├── features/
│   │   ├── families/
│   │   │   ├── api.ts
│   │   │   ├── components/
│   │   │   ├── filters/
│   │   │   └── types.ts
│   │   └── transparency/
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── env.ts
│   │   └── utils.ts
│   │
│   └── styles/
│       └── globals.css
│
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

Landing should call public backend endpoints like:

```txt
GET /families/public
GET /families/public/:publicCode
GET /transparency/public
```

Do not put admin, family-account, or post-submission sponsor-management logic in
landing. Landing may authenticate visitor/sponsor accounts only for registration,
live family browsing, and `POST /donor/sponsorships`; all authorization and
business rules remain enforced by the API.

---

## 4. What goes in `apps/dashboard`

Your dashboard should be one Next.js app with role-based sections. Route groups are good, but remember: route groups organize files; they do not secure the app by themselves.

Recommended structure:

```txt
apps/dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                         # Redirect based on session/role
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx                 # Sponsor registration
│   │   │   ├── forgot-password/
│   │   │   └── verify-email/
│   │   │
│   │   └── (protected)/
│   │       └── dashboard/
│   │           ├── layout.tsx               # Central dashboard shell
│   │           ├── page.tsx                 # Role redirect
│   │           │
│   │           ├── admin/
│   │           │   ├── layout.tsx
│   │           │   ├── page.tsx
│   │           │   ├── families/
│   │           │   ├── sponsors/
│   │           │   ├── sponsorships/
│   │           │   ├── receiving-methods/
│   │           │   ├── moderation/
│   │           │   ├── transfer-proofs/
│   │           │   ├── transparency/
│   │           │   ├── users/
│   │           │   ├── activity-logs/
│   │           │   └── settings/
│   │           │
│   │           ├── sponsor/
│   │           │   ├── layout.tsx
│   │           │   ├── page.tsx
│   │           │   ├── my-families/
│   │           │   ├── sponsorships/
│   │           │   ├── transfer-proofs/
│   │           │   ├── messages/
│   │           │   ├── media/
│   │           │   └── settings/
│   │           │
│   │           └── family/
│   │               ├── layout.tsx
│   │               ├── page.tsx
│   │               ├── profile/
│   │               ├── update-requests/
│   │               ├── receiving-methods/
│   │               ├── messages/
│   │               ├── media/
│   │               └── sponsorship-status/
│   │
│   ├── proxy.ts                              # Route protection boundary
│   │
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── dashboard-shell.tsx
│   │   │   ├── dashboard-sidebar.tsx
│   │   │   ├── dashboard-header.tsx
│   │   │   └── role-badge.tsx
│   │   ├── forms/
│   │   ├── tables/
│   │   ├── modals/
│   │   └── shared/
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── families/
│   │   ├── sponsorships/
│   │   ├── receiving-methods/
│   │   ├── messages/
│   │   ├── moderation/
│   │   ├── transfer-proofs/
│   │   ├── media/
│   │   ├── users/
│   │   ├── notifications/
│   │   └── activity-logs/
│   │
│   ├── config/
│   │   ├── navigation.ts
│   │   ├── roles.ts
│   │   └── permissions.ts
│   │
│   ├── lib/
│   │   ├── api-client.ts
│   │   ├── auth.ts
│   │   ├── guards.ts
│   │   └── env.ts
│   │
│   └── styles/
│       └── globals.css
│
├── package.json
├── next.config.ts
├── tsconfig.json
└── tailwind.config.ts
```

Yes, you should have a **central dashboard sidebar**, but it should be role-aware:

```ts
// apps/dashboard/src/config/navigation.ts

export const dashboardNavigation = {
  admin: [
    { label: "Families", href: "/dashboard/admin/families" },
    { label: "Moderation", href: "/dashboard/admin/moderation" },
    { label: "Transfer Proofs", href: "/dashboard/admin/transfer-proofs" },
    { label: "Users", href: "/dashboard/admin/users" },
  ],
  sponsor: [
    { label: "My Families", href: "/dashboard/sponsor/my-families" },
    { label: "Sponsorships", href: "/dashboard/sponsor/sponsorships" },
    { label: "Messages", href: "/dashboard/sponsor/messages" },
  ],
  family: [
    { label: "My Profile", href: "/dashboard/family/profile" },
    { label: "Update Requests", href: "/dashboard/family/update-requests" },
    { label: "Messages", href: "/dashboard/family/messages" },
  ],
} as const;
```

Important: hiding links in sidebar is only UX. Real security must happen in `proxy.ts`, server components, and backend guards.

Next.js 16 uses `proxy.ts`; the old `middleware.ts` convention has been renamed/deprecated, and Proxy runs before the request completes, so it is suitable for redirects and coarse route protection. ([Next.js][6])

Example:

```ts
// apps/dashboard/src/proxy.ts

import { NextResponse, type NextRequest } from "next/server";

const roleHome = {
  admin: "/dashboard/admin",
  sponsor: "/dashboard/sponsor",
  family: "/dashboard/family",
} as const;

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const token = req.cookies.get("access_token")?.value;
  const role = req.cookies.get("user_role")?.value as keyof typeof roleHome | undefined;

  if (pathname.startsWith("/dashboard") && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (pathname === "/dashboard" && role && roleHome[role]) {
    return NextResponse.redirect(new URL(roleHome[role], req.url));
  }

  if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(role ? roleHome[role] : "/login", req.url));
  }

  if (pathname.startsWith("/dashboard/sponsor") && role !== "sponsor") {
    return NextResponse.redirect(new URL(role ? roleHome[role] : "/login", req.url));
  }

  if (pathname.startsWith("/dashboard/family") && role !== "family") {
    return NextResponse.redirect(new URL(role ? roleHome[role] : "/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
```

For your MVP, the dashboard should support sponsor, family, and admin shells, but the admin shell should internally support sub-roles like family manager, moderator, transfer proof reviewer, system admin, and auditor because your document defines these separate permission levels. 

---

## 5. What goes in `apps/api`

NestJS should own all real business rules, RBAC, database access, encryption, moderation workflows, and file protection.

```txt
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── config/
│   │   ├── env.validation.ts
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   ├── storage.config.ts
│   │   └── mail.config.ts
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── permissions.guard.ts
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── database/
│   │   ├── data-source.ts
│   │   ├── migrations/
│   │   └── seeds/
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── families/
│   │   ├── family-profile-update-requests/
│   │   ├── receiving-methods/
│   │   ├── sponsorships/
│   │   ├── transfer-proofs/
│   │   ├── messages/
│   │   ├── moderation/
│   │   ├── media/
│   │   ├── notifications/
│   │   ├── transparency/
│   │   ├── activity-logs/
│   │   └── admin/
│   │
│   └── shared/
│       ├── enums/
│       ├── constants/
│       └── helpers/
│
├── package.json
├── tsconfig.json
└── nest-cli.json
```

Nest officially supports TypeORM integration, and TypeORM supports PostgreSQL. ([NestJS Documentation][7])

For TypeORM, use this rule from day one:

```ts
synchronize: false
```

TypeORM itself warns that `synchronize: true` is unsafe for production once you have real data, and migrations are the proper way to sync schema changes. ([TypeORM][8])

Add migration scripts inside `apps/api/package.json`:

```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
    "migration:create": "pnpm typeorm migration:create",
    "migration:generate": "pnpm typeorm migration:generate",
    "migration:run": "pnpm typeorm migration:run",
    "migration:revert": "pnpm typeorm migration:revert",
    "migration:show": "pnpm typeorm migration:show"
  }
}
```

TypeORM CLI supports commands like `migration:generate`, `migration:run`, `migration:revert`, and `migration:show`. ([TypeORM][9])

---

## 6. Should you create `packages/ui`?

For this project, I would **not force `packages/ui` on day one** unless you are intentionally building a shared design system.

Because:

* Landing page UI is marketing/public.
* Dashboard UI is data-heavy/admin-heavy.
* Mobile UI will be React Native, not directly reusable with normal web components.

But I **would still create shared packages** like:

```txt
packages/contracts
packages/constants
packages/utils
packages/typescript-config
packages/eslint-config
```

These are useful from day one.

Create `packages/ui` only if you want shared primitives like:

```txt
Button
Input
Select
Dialog
Badge
Card
Table primitives
Form components
```

If using shadcn/ui monorepo style, shared components can be imported like a workspace package, for example `@workspace/ui/components/button`. ([ShadCN][10])

My recommendation:

```txt
P0:
  packages/contracts
  packages/constants
  packages/utils
  packages/typescript-config
  packages/eslint-config

P1:
  packages/ui only if landing + dashboard start duplicating components
```

---

## 7. `@/` alias is allowed in Next.js

This is a common confusion. You **can use `@/` inside each Next.js app**. Next.js has built-in support for `baseUrl` and `paths`, and their own docs show importing like `@/components/button`. ([Next.js][11])

Good usage:

```ts
// inside apps/dashboard only
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
```

Bad usage:

```ts
// do not use this to reach another app or package
import { something } from "@/../../packages/contracts";
```

For shared packages, use package imports:

```ts
import { UserRole } from "@muakhah/contracts";
import { FAMILY_STATUS } from "@muakhah/constants";
```

Rule:

```txt
@/ = current app only
@muakhah/* = shared workspace packages
No app should import from another app
```

---

## 8. How packages are “deployed”

Shared packages are **not deployed separately** unless they are actual services.

Example:

```txt
apps/dashboard imports packages/contracts
apps/dashboard imports packages/ui
```

When dashboard builds, pnpm links the workspace dependency locally, Turborepo builds dependencies in the correct order, and the final dashboard deployment contains/bundles what it needs.

So:

```txt
apps/landing       -> deployed as its own app
apps/dashboard     -> deployed as its own app
apps/api           -> deployed as its own backend service
apps/mobile        -> built with EAS / app stores
packages/contracts -> not deployed alone
packages/ui        -> not deployed alone
packages/utils     -> not deployed alone
```

On Vercel, you create a separate project for each deployable directory and set the project’s **Root Directory** to that app, for example `apps/landing` or `apps/dashboard`. Vercel’s monorepo docs say to create a separate project for each directory you want to deploy and configure each project’s root directory accordingly. ([Vercel][12])

For Expo EAS, Expo says EAS commands should be run from the root of the app directory, for example `apps/mobile`, and EAS files like `eas.json` should live in that app directory. ([Expo Documentation][13])

---

## 9. pnpm install commands you need

Turborepo docs recommend installing dependencies **where they are used**, not everything in root. Turborepo itself does not manage dependencies; pnpm does that. ([Turborepo][14])

### Install dependency in dashboard only

```bash
pnpm --filter @muakhah/dashboard add react-hook-form zod
```

### Install dev dependency in dashboard only

```bash
pnpm --filter @muakhah/dashboard add -D @types/node
```

### Install dependency in API only

```bash
pnpm --filter @muakhah/api add @nestjs/typeorm typeorm pg
```

### Install dependency in mobile only

```bash
pnpm --filter @muakhah/mobile add expo-secure-store
```

### Install dependency in landing only

```bash
pnpm --filter @muakhah/landing add framer-motion
```

### Add internal package to dashboard

```bash
pnpm --filter @muakhah/dashboard add @muakhah/contracts@workspace:*
```

### Add internal package to API

```bash
pnpm --filter @muakhah/api add @muakhah/contracts@workspace:*
```

pnpm supports `--filter` to restrict commands to a specific package/workspace. ([pnpm][15])

### Install root-only tooling

Use root only for repo-wide tools:

```bash
pnpm add -D prettier turbo -w
```

Root should contain only tools like:

```txt
turbo
prettier
lint-staged
husky
commitlint
```

Do not install app libraries like `axios`, `react-hook-form`, `typeorm`, or `expo-secure-store` in root unless root actually uses them.

---

## 10. Root files

### Root `package.json`

```json
{
  "name": "muakhah-platform",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,js,jsx,json,md}\"",

    "dev:landing": "pnpm --filter @muakhah/landing dev",
    "dev:dashboard": "pnpm --filter @muakhah/dashboard dev",
    "dev:api": "pnpm --filter @muakhah/api start:dev",
    "dev:mobile": "pnpm --filter @muakhah/mobile start"
  },
  "devDependencies": {
    "turbo": "latest",
    "prettier": "latest"
  }
}
```

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**", "build/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

---

## 11. TypeORM vs Prisma for this project

You can safely use **TypeORM + PostgreSQL** here.

The uploaded MVP doc mentions Prisma in the initial backlog, but that is not a hard technical requirement. The important thing is the data model, RBAC, privacy, moderation, file security, encrypted receiving methods, logs, sponsorship commitments, and transfer proof workflows. 

TypeORM is a good fit because:

* You are using NestJS.
* Your database is relational and workflow-heavy.
* You may need custom SQL/query builder for admin filters and moderation queues.
* You want predictable migration control.
* You already prefer TypeORM from production experience.

But follow these rules:

```txt
Use TypeORM entities only inside API.
Do not import TypeORM entities into landing/dashboard/mobile.
Expose DTOs through packages/contracts or generated API types.
Use migrations, not synchronize:true.
Use transactions for sponsorship coverage updates.
Encrypt receiving method details before saving.
```

---

## 12. Backend modules mapped to MVP

Based on your MVP doc, backend modules should be:

```txt
auth
users
families
family-profile-update-requests
receiving-methods
sponsorships
transfer-proofs
messages
moderation
media
notifications
transparency
activity-logs
admin
```

Your API should enforce business rules like:

* family cannot self-register in MVP
* images blurred by default
* receiving details hidden before sponsorship
* messages/media must be moderated
* coverage cannot exceed 100% unless admin-approved
* transfer proof acceptance does not mean platform received money
* every sensitive action logged

These are core requirements in your document, so they belong in backend rules, not only frontend UI. 

---

## 13. Suggested `.md` rules for colleagues and AI agents

Create this file:

```txt
docs/RULES.md
```

Starter content:

```md
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
```

---

## Final recommendation

Use:

```bash
pnpm dlx create-turbo@latest muakhah-platform
```

Then build this structure:

```txt
apps/landing
apps/dashboard
apps/api
apps/mobile
packages/contracts
packages/constants
packages/utils
packages/typescript-config
packages/eslint-config
```

Delay `packages/ui` until you actually see repeated UI between landing and dashboard. Use `@/` freely inside each Next.js app, but use `@muakhah/*` for shared packages. Deploy each app independently, and let pnpm/Turbo include shared packages during build.

[1]: https://turborepo.dev/docs "Introduction"
[2]: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository "Structuring a repository"
[3]: https://turborepo.com/docs/getting-started/examples "Start with an example"
[4]: https://turbo.build/docs/reference/create-turbo "create-turbo"
[5]: https://pnpm.io/pnpm-workspace_yaml "pnpm-workspace.yaml | pnpm"
[6]: https://nextjs.org/docs/app/api-reference/file-conventions/proxy "File-system conventions: proxy.js | Next.js"
[7]: https://docs.nestjs.com/techniques/database "Database | NestJS - A progressive Node.js framework"
[8]: https://typeorm.io/docs/migrations/why/?utm_source=chatgpt.com "How migrations work?"
[9]: https://typeorm.io/docs/using-cli/?utm_source=chatgpt.com "Using CLI"
[10]: https://ui.shadcn.com/docs/monorepo "Monorepo - shadcn/ui"
[11]: https://nextjs.org/docs/13/app/building-your-application/configuring/absolute-imports-and-module-aliases "Configuring: Absolute Imports and Module Path Aliases | Next.js"
[12]: https://vercel.com/docs/monorepos "Using Monorepos"
[13]: https://docs.expo.dev/build-reference/build-with-monorepos/ "Set up EAS Build with a monorepo - Expo Documentation"
[14]: https://turborepo.dev/docs/crafting-your-repository/managing-dependencies "Managing dependencies"
[15]: https://pnpm.io/filtering "Filtering | pnpm"
