# Muakhah Tailwind CSS Shared Package Reference

This document explains how Tailwind CSS is configured in the Muakhah monorepo, how each app uses it, and how shared UI packages should be handled.

The setup is already working. This file is mainly for future reference so any developer can understand the structure, use Tailwind correctly, and avoid breaking the monorepo rules.

---

## 1. Purpose of This Setup

The Muakhah repository uses:

- pnpm workspaces
- Turborepo
- Next.js apps inside `apps/*`
- Shared packages inside `packages/*`

Tailwind CSS is configured as a shared package so multiple web apps can use the same design tokens, theme values, and PostCSS setup without duplicating configuration.

Current intended usage:

```txt
apps/landing       -> uses shared Tailwind setup
apps/dashboard     -> uses shared Tailwind setup
packages/ui        -> optional shared UI components that may use Tailwind classes
packages/tailwind-config -> shared Tailwind/PostCSS/CSS theme package
```

The API and mobile app do not use this web Tailwind setup directly.

```txt
apps/api           -> no Tailwind needed
apps/mobile        -> Expo/React Native styling is separate
```

---

## 2. Important Monorepo Rule

Apps must not import files from other apps.

Allowed:

```txt
apps/dashboard -> packages/tailwind-config
apps/landing   -> packages/tailwind-config
apps/dashboard -> packages/ui
apps/landing   -> packages/ui
```

Not allowed:

```txt
apps/dashboard -> apps/landing/src
apps/landing   -> apps/dashboard/src
apps/mobile    -> apps/dashboard/src
```

Shared styling, shared components, shared contracts, and shared utilities should live inside `packages/*`.

---

## 3. Why PostCSS Is Needed

Tailwind CSS is being used through the official PostCSS plugin setup.

Tailwind v4 uses:

```txt
tailwindcss
@tailwindcss/postcss
postcss
```

The PostCSS config loads the Tailwind PostCSS plugin:

```js
const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default postcssConfig;
```

Each Next.js app that compiles Tailwind CSS needs access to this PostCSS config.

---

## 4. Shared Tailwind Package Location

The shared Tailwind package lives here:

```txt
packages/tailwind-config
```

Recommended structure:

```txt
packages/tailwind-config/
├── package.json
├── postcss.config.mjs
└── shared-styles.css
```

---

## 5. Shared Package `package.json`

The shared package should look like this:

```json
{
  "name": "@muakhah/tailwind-config",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./shared-styles.css",
    "./postcss": "./postcss.config.mjs"
  },
  "peerDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.0.0"
  }
}
```

### Why this package exports two things

The default export:

```txt
@muakhah/tailwind-config
```

points to:

```txt
shared-styles.css
```

This allows apps to import the shared Tailwind CSS theme.

The PostCSS export:

```txt
@muakhah/tailwind-config/postcss
```

points to:

```txt
postcss.config.mjs
```

This allows apps to reuse the same PostCSS plugin config.

---

## 6. Shared PostCSS Config

File:

```txt
packages/tailwind-config/postcss.config.mjs
```

Content:

```js
const postcssConfig = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default postcssConfig;
```

Every web app can reuse this config instead of repeating it.

---

## 7. Shared Tailwind CSS Theme

File:

```txt
packages/tailwind-config/shared-styles.css
```

Example content:

```css
@import "tailwindcss";

@theme {
  --color-muakhah-primary: #0f766e;
  --color-muakhah-primary-dark: #115e59;
  --color-muakhah-primary-light: #ccfbf1;

  --color-muakhah-background: #ffffff;
  --color-muakhah-foreground: #0f172a;

  --color-muakhah-muted: #f8fafc;
  --color-muakhah-muted-foreground: #64748b;

  --color-muakhah-border: #e2e8f0;
  --color-muakhah-danger: #dc2626;
  --color-muakhah-success: #16a34a;
  --color-muakhah-warning: #d97706;

  --radius-muakhah-sm: 0.375rem;
  --radius-muakhah-md: 0.5rem;
  --radius-muakhah-lg: 0.75rem;
  --radius-muakhah-xl: 1rem;
}
```

After defining these theme variables, classes like these can be used:

```tsx
<div className="bg-muakhah-primary text-white rounded-muakhah-lg">
  Muakhah
</div>
```

---

## 8. Installing Dependencies

Do not install app-specific dependencies in the root package unless the root actually uses them.

Tailwind is compiled by the web apps, so Tailwind dependencies should be installed in the apps that use Tailwind.

For Landing:

```bash
pnpm --filter @muakhah/landing add -D tailwindcss @tailwindcss/postcss postcss
```

For Dashboard:

```bash
pnpm --filter @muakhah/dashboard add -D tailwindcss @tailwindcss/postcss postcss
```

Then add the shared Tailwind package to each app:

```bash
pnpm --filter @muakhah/landing add @muakhah/tailwind-config@workspace:*
pnpm --filter @muakhah/dashboard add @muakhah/tailwind-config@workspace:*
```

This keeps the monorepo clean and follows the rule:

```txt
Install dependencies where they are used.
```

---

## 9. App-Level PostCSS Config

Each app should have its own small PostCSS config file that simply re-exports the shared config.

Landing:

```txt
apps/landing/postcss.config.mjs
```

Dashboard:

```txt
apps/dashboard/postcss.config.mjs
```

Content:

```js
export { default } from "@muakhah/tailwind-config/postcss";
```

This means both apps use the same Tailwind PostCSS setup.

---

## 10. App-Level Global CSS Import

Each app should import the shared Tailwind CSS package inside its global CSS file.

Landing:

```txt
apps/landing/src/app/globals.css
```

Dashboard:

```txt
apps/dashboard/src/app/globals.css
```

Content:

```css
@import "@muakhah/tailwind-config";
```

Make sure the app imports its global CSS in `layout.tsx`.

Example:

```tsx
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

---

## 11. Using Tailwind in Apps

Example inside `apps/landing`:

```tsx
export default function HomePage() {
  return (
    <main className="min-h-screen bg-muakhah-background text-muakhah-foreground flex items-center justify-center">
      <h1 className="text-4xl font-bold text-muakhah-primary">
        Muakhah Landing
      </h1>
    </main>
  );
}
```

Example inside `apps/dashboard`:

```tsx
export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-muakhah-muted text-muakhah-foreground p-8">
      <div className="rounded-muakhah-xl border border-muakhah-border bg-white p-6">
        <h1 className="text-3xl font-bold text-muakhah-primary">
          Muakhah Dashboard
        </h1>
      </div>
    </main>
  );
}
```

---

## 12. Using Tailwind Inside `packages/ui`

If the project later uses a shared UI package, it may look like this:

```txt
packages/ui/
├── package.json
└── src/
    └── components/
        └── button.tsx
```

Example shared component:

```tsx
export function Button({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <button className="rounded-muakhah-md bg-muakhah-primary px-4 py-2 text-white">
      {children}
    </button>
  );
}
```

If `packages/ui` contains Tailwind classes, the consuming app must tell Tailwind to scan that package.

Add this to each app's global CSS:

```css
@import "@muakhah/tailwind-config";

@source "../../../../packages/ui/src";
```

Use this in:

```txt
apps/landing/src/app/globals.css
apps/dashboard/src/app/globals.css
```

### Why `@source` is needed

Tailwind scans source files to find utility classes. In monorepos, shared package files may not always be detected automatically. The `@source` directive makes sure Tailwind also scans shared UI components.

Without this, Tailwind classes used only inside `packages/ui` may not be generated.

---

## 13. Installing and Using `packages/ui`

If a shared UI package is created, apps should install it like this:

```bash
pnpm --filter @muakhah/landing add @muakhah/ui@workspace:*
pnpm --filter @muakhah/dashboard add @muakhah/ui@workspace:*
```

Then import components by package name:

```tsx
import { Button } from "@muakhah/ui";
```

Do not import shared UI with relative paths like this:

```tsx
import { Button } from "../../../packages/ui/src/components/button";
```

Do not import shared UI using `@/`:

```tsx
import { Button } from "@/../../packages/ui/src/components/button";
```

The `@/` alias means current app only.

---

## 14. What Happens When Someone Pulls the Repo?

If someone pulls the repository for the first time, they usually only need to run this from the root:

```bash
pnpm install
```

This will:

- install root tooling dependencies
- install dependencies for all workspace apps/packages
- link internal workspace packages like `@muakhah/tailwind-config`
- make shared package imports work locally

After that, they can run whichever app they need.

Examples:

```bash
pnpm --filter @muakhah/landing dev
```

```bash
pnpm --filter @muakhah/dashboard dev
```

Or, if the root script exists:

```bash
pnpm dev
```

### Important

Developers should run `pnpm install` from the root, not from inside `apps/landing` or `apps/dashboard`.

Correct:

```bash
pnpm install
```

from:

```txt
muakhah-platform/
```

Incorrect:

```bash
cd apps/dashboard
pnpm install
```

Running installs from inside individual apps can cause dependency/linking issues in a workspace monorepo.

---

## 15. When Should Someone Run `pnpm install` Again?

Run this from root whenever:

- a new dependency is added
- `package.json` changes in any app or package
- `pnpm-lock.yaml` changes
- a new workspace package is added
- switching branches where dependencies changed
- after taking a fresh pull from Git

Command:

```bash
pnpm install
```

---

## 16. Common Development Commands

Run Landing:

```bash
pnpm --filter @muakhah/landing dev
```

Run Dashboard:

```bash
pnpm --filter @muakhah/dashboard dev
```

Run API:

```bash
pnpm --filter @muakhah/api start:dev
```

Run all dev tasks if configured in root:

```bash
pnpm dev
```

Build all apps/packages with Turbo:

```bash
pnpm build
```

Build only Landing:

```bash
pnpm --filter @muakhah/landing build
```

Build only Dashboard:

```bash
pnpm --filter @muakhah/dashboard build
```

---

## 17. Adding More Tailwind Tokens

Add shared design tokens in:

```txt
packages/tailwind-config/shared-styles.css
```

Example:

```css
@theme {
  --color-muakhah-card: #ffffff;
  --color-muakhah-card-foreground: #0f172a;

  --shadow-muakhah-card: 0 8px 30px rgba(15, 23, 42, 0.08);
}
```

Then use them:

```tsx
<div className="bg-muakhah-card text-muakhah-card-foreground shadow-muakhah-card">
  Card content
</div>
```

Keep shared tokens generic and platform-level. Avoid adding one-off page-specific values unless they are part of the design system.

---

## 18. Recommended Pattern for App-Specific CSS

Shared/global design tokens should go in:

```txt
packages/tailwind-config/shared-styles.css
```

App-specific CSS should stay inside the app.

Example:

```txt
apps/landing/src/app/globals.css
apps/dashboard/src/app/globals.css
```

Landing-specific styles should not be forced into the shared Tailwind package unless Dashboard also needs them.

Dashboard-specific admin styles should not be forced into the shared Tailwind package unless Landing or shared UI also needs them.

---

## 19. Should Tailwind Be Installed in the Root?

Usually no.

Do not do this unless the root package itself is compiling CSS:

```bash
pnpm add -D tailwindcss @tailwindcss/postcss postcss -w
```

For this monorepo, Tailwind belongs in the web apps that use it:

```bash
pnpm --filter @muakhah/landing add -D tailwindcss @tailwindcss/postcss postcss
pnpm --filter @muakhah/dashboard add -D tailwindcss @tailwindcss/postcss postcss
```

The shared package exposes config and CSS, but the apps do the actual CSS compilation.

---

## 20. Troubleshooting

### Tailwind classes are not working in the app

Check that the app has:

```txt
postcss.config.mjs
```

with:

```js
export { default } from "@muakhah/tailwind-config/postcss";
```

Also check that the app's global CSS imports:

```css
@import "@muakhah/tailwind-config";
```

And confirm `layout.tsx` imports the global CSS:

```tsx
import "./globals.css";
```

---

### Tailwind classes work in app files but not in `packages/ui`

Add `@source` to the consuming app's global CSS:

```css
@import "@muakhah/tailwind-config";

@source "../../../../packages/ui/src";
```

Then restart the dev server.

---

### Internal package cannot be resolved

Run from repo root:

```bash
pnpm install
```

Make sure the app has the internal package dependency:

```json
{
  "dependencies": {
    "@muakhah/tailwind-config": "workspace:*"
  }
}
```

If using shared UI:

```json
{
  "dependencies": {
    "@muakhah/ui": "workspace:*"
  }
}
```

---

### PostCSS config cannot find `@tailwindcss/postcss`

Make sure the app has these dev dependencies:

```json
{
  "devDependencies": {
    "tailwindcss": "^4.0.0",
    "@tailwindcss/postcss": "^4.0.0",
    "postcss": "^8.0.0"
  }
}
```

Install them with:

```bash
pnpm --filter @muakhah/landing add -D tailwindcss @tailwindcss/postcss postcss
pnpm --filter @muakhah/dashboard add -D tailwindcss @tailwindcss/postcss postcss
```

---

### After pulling latest code, the app fails to start

First run:

```bash
pnpm install
```

from the root.

Then restart the app:

```bash
pnpm --filter @muakhah/dashboard dev
```

or:

```bash
pnpm --filter @muakhah/landing dev
```

---

## 21. Final Rule for Developers

For normal usage after pulling the repo:

```bash
pnpm install
```

from the root is enough to install dependencies and link workspace packages.

Then run the app you need:

```bash
pnpm --filter @muakhah/landing dev
```

or:

```bash
pnpm --filter @muakhah/dashboard dev
```

For shared UI Tailwind support, remember:

```css
@source "../../../../packages/ui/src";
```

must be added in the consuming app's global CSS if Tailwind classes are written inside `packages/ui`.

---

## 22. Quick Checklist

For each web app using Tailwind:

- [ ] App has `tailwindcss`, `@tailwindcss/postcss`, and `postcss`
- [ ] App depends on `@muakhah/tailwind-config@workspace:*`
- [ ] App has `postcss.config.mjs`
- [ ] App global CSS imports `@muakhah/tailwind-config`
- [ ] App layout imports `globals.css`
- [ ] If using `packages/ui`, app global CSS includes `@source "../../../../packages/ui/src"`
- [ ] Developers run `pnpm install` from the root after pull

---

## 23. Clean Example

App PostCSS config:

```js
export { default } from "@muakhah/tailwind-config/postcss";
```

App global CSS without shared UI:

```css
@import "@muakhah/tailwind-config";
```

App global CSS with shared UI:

```css
@import "@muakhah/tailwind-config";

@source "../../../../packages/ui/src";
```

Install dependencies after pull:

```bash
pnpm install
```

Run app:

```bash
pnpm --filter @muakhah/dashboard dev
```
