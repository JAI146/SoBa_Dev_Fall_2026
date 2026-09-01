# PurposeMint Tailwind CSS Guide

## 1. Scope

Tailwind CSS is used for the **web dashboard only**: `apps/dashboard`.

The Expo React Native application does not use the dashboard's Tailwind
configuration or web components.

Do not add a shared `packages/tailwind-config` package unless a second web
application is introduced and genuinely needs the same Tailwind theme. For the
current repository, keep Tailwind configuration local to `apps/dashboard`.

---

## 2. Recommended Dashboard Structure

```text
apps/dashboard/
  src/
    app/
      globals.css
      layout.tsx
    components/
      ui/
      layout/
      dashboard/
    features/
    lib/
  postcss.config.*
  package.json
```

Use application-level CSS variables and design tokens in `globals.css`. Keep
feature-specific components near their features. Keep generic dashboard
primitives under `src/components/ui`.

---

## 3. PurposeMint Design Tokens

Define reusable semantic tokens rather than repeating raw colors throughout
components.

Example semantic groups:

```text
background
foreground
card
muted
primary
secondary
accent
success
warning
danger
border
input
ring
```

PurposeMint's visual direction uses warm magenta, mint/teal, gold, cream, and
dark plum tones (see the brand book at `docs/brand/`), but components should
reference semantic classes instead of hard-coded brand values.

Preferred:

```tsx
<div className="bg-card text-foreground border-border" />
```

Avoid repeated raw values such as:

```tsx
<div className="bg-[#fff7fb] text-[#26002f] border-[#edc6d8]" />
```

Raw values are acceptable only for a one-off design requirement that cannot
reasonably be represented by an existing token.

---

## 4. Component Styling Rules

Prefer small, composable class sets.

```tsx
<button
  className="
    inline-flex items-center justify-center
    rounded-xl px-4 py-2
    font-medium
    transition-colors
    disabled:pointer-events-none disabled:opacity-50
  "
>
  Continue
</button>
```

Use a class-merging helper for conditional classes:

```ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}
```

Do not construct uncontrolled class strings from arbitrary API values. Avoid
deeply nested conditional class expressions inside JSX — move complex variants
into a component variant helper or a named variable.

---

## 5. Responsive Design

Build mobile-first. Preferred order: `base -> sm -> md -> lg -> xl`.

```tsx
<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4" />
```

Test the dashboard at minimum at: small laptop, standard desktop, large
desktop, tablet width, and narrow browser width. Do not assume the dashboard
will only be used on a full-width monitor.

---

## 6. Layout Rules

Use a consistent shell for sidebar, top navigation, page title, breadcrumbs,
main content, and action area. Avoid page-level one-off widths when a shared
container can be used.

Recommended patterns:

```text
max-w-screen-2xl
mx-auto
w-full
px-4 sm:px-6 lg:px-8
```

Tables and dense financial data may use horizontal scrolling on smaller
screens. Do not allow dashboard tables to force the entire page beyond the
viewport.

---

## 7. Typography Rules

Use a small, documented typography scale.

Recommended semantic use: Page title, Section title, Card title, Body, Muted
body, Label, Caption.

Do not select font sizes independently for every component. Keep financial
values, statuses, and primary actions visually clear. Avoid low-contrast muted
text for important compliance or transaction information.

---

## 8. Form Rules

Every form control must have: an associated label, visible focus state,
disabled state, error state, helper text when required, and keyboard
accessibility.

Use consistent spacing between labels, controls, helper text, and errors.
Never communicate validation errors by color alone.

For sensitive financial operations, clearly separate information, warning,
destructive confirmation, and final submission.

---

## 9. Status and Financial State Styling

Use semantic status variants — examples: `pending`, `processing`, `active`,
`completed`, `failed`, `blocked`, `requires_action`, `cancelled`.

Each status should have readable text, consistent badge styling, sufficient
contrast, an icon when useful, and no reliance on color alone. Do not use the
same visual style for a harmless pending state and a compliance-blocked state.

---

## 10. Accessibility

All interactive controls must be keyboard accessible. Maintain visible focus
indicators. Use semantic HTML before adding ARIA attributes. Meet appropriate
contrast requirements for text and controls. Respect reduced-motion
preferences. Do not use animation as the only indication of progress. Icons
used without visible text must have accessible labels.

---

## 11. Dark Mode

Do not implement dark mode merely because Tailwind supports it. Add dark mode
only when it is part of the approved PurposeMint design scope. When
implemented, use semantic variables so components do not contain separate
hard-coded dark color values.

---

## 12. Shared Web UI

A separate `packages/ui` package is not needed while `apps/dashboard` is the
only web application. Keep dashboard components inside the dashboard. Create
a shared web UI package later only when another web app exists, the same
components are being duplicated, the components have stable shared APIs, and
the package would reduce maintenance rather than add abstraction. React Native
components must never be placed in the web UI package.

---

## 13. Tailwind Config Package

A separate `packages/tailwind-config` package is not required for the current
architecture. Delete it only when only the dashboard uses Tailwind, no other
web app consumes its preset, and the dashboard can keep its styles locally.

Before deleting, search for references:

```bash
rg -n "tailwind-config|@purposemint/tailwind-config" .
```

After deleting:

```bash
pnpm install
pnpm --filter @purposemint/dashboard dev
pnpm lint
pnpm check-types
pnpm build
```

---

## 14. React Native Styling

Do not import dashboard CSS or Tailwind web classes into `apps/mobile`. Choose
the mobile styling approach separately.

Recommended default: React Native `StyleSheet` + reusable design tokens.

NativeWind may be introduced only after an explicit team decision — it should
not be added merely to reuse the dashboard's Tailwind configuration, because
web and native components remain different. Shared visual values may later
live in a platform-neutral design-token package, but actual web and native
components should stay separate.

---

## 15. Review Checklist

Before merging dashboard UI work, confirm:

- semantic tokens are used
- layout is responsive
- focus states are visible
- forms have labels and errors
- financial states use consistent variants
- no sensitive information is revealed by styling or hidden-only UI
- tables handle smaller widths
- duplicated classes are extracted only when repetition is meaningful
- no app imports from another app
- mobile code does not depend on dashboard Tailwind files
