# PurposeMint — Design Tokens & Product Voice

Authoritative for colour, tone and component direction across mobile and dashboard.
Extracted from the approved "PurposeMint UI Visual Direction" board so the values exist as
text rather than only inside an image.

---

## 1. Brand Palette

| Token | Hex | Use |
| --- | --- | --- |
| Mint | `#DDF3EF` | Primary surface tint, card backgrounds, calm sections |
| Teal | `#1E8A78` | Primary action, progress fill, active states, brand anchor |
| Cream | `#FFF5E6` | Warm secondary surface, onboarding and reflection backgrounds |
| Lavender | `#EFEAFB` | Tertiary surface, coaching and premium sections |
| Coral | `#FF7D6E` | Alerts, attention states, accent highlights — **never** used to scold |
| Gold | `#E7B75F` | Badges, achievements, streak milestones, celebration |

Neutrals (text, borders, muted) are defined per platform. Contrast must meet WCAG AA for
body text and interactive controls.

**Rules**

- Components reference semantic tokens (`primary`, `surface`, `success`, `warning`,
  `danger`, `border`, `muted`), never raw hex.
- Coral is an attention colour, not a failure colour. A missed habit is never rendered in
  a colour that reads as punishment.
- Gold is reserved for earned achievements. Do not use it for upsell decoration.
- Semantic groups in use: `background`, `foreground`, `card`, `muted`, `primary`,
  `secondary`, `accent`, `success`, `warning`, `danger`, `border`, `input`, `ring`.

Superseded: an earlier description of the palette as "warm pink, mint/teal, gold, cream,
dark plum". Ignore it. This table is current.

---

## 2. Component Direction

| Component | Direction |
| --- | --- |
| Cards | Rounded, soft, friendly. Readable blocks for goals and dashboard sections. |
| Progress bars | Clear saving progress. Prefer a single bar over a chart. No dense financial charts on the main dashboard. |
| Badges | Positive reward language for small wins and streaks. |
| Copy | No shame, no jargon, no pressure-based reminders. |
| States | Empty, loading, error and permission screens written in plain language for beginners. |

Reference layout, from the approved home screen mock:

```text
Good morning, Maya
Small wins count today.

[card]  Emergency cushion              62%
        ▓▓▓▓▓▓▓▓▓▓▓░░░░░░

[card]  Today's micro-win
        Move $5 to savings      [ Done ]

[card]  KiroMoney AI Coach
        Small step suggestion ready
```

Note the pattern: greeting → one affirming line → progress → a single concrete next action
→ optional coaching. The dashboard leads with encouragement, not with numbers.

---

## 3. Voice

Fixed attributes: warm, affirming, minimal, beginner-friendly, trauma-informed, culturally
relevant, non-judgemental.

**Do**

- Celebrate the action taken, not the total accumulated
- Offer one next step at a time
- Use real-life goal language: bill buffer, therapy session fund, back-to-school supplies,
  kids birthday fund, groceries, self-care, fresh haircut fund, coffee joy runs
- Let users pause without penalty

**Do not**

- Show streak-loss warnings, guilt framing or countdown pressure
- Use finance jargon without a plain-language equivalent
- Imply the user is behind, failing or irresponsible
- Send bulk or frequent notifications — the focus-group finding was explicit that users
  distrust "junky" notification behaviour

---

## 4. Notification Principles

Notifications should read as encouragement, not pressure. Every send must respect user
preferences and quiet hours.

| Template | Tone |
| --- | --- |
| Habit reminder | Gentle, optional, single action |
| Badge unlock | Celebratory, specific to what was earned |
| Weekly summary | Progress-framed, never deficit-framed |
| Subscription notice | Factual, no urgency pressure |
| Re-engagement nudge | Warm, no guilt, easy to ignore |

Backend checks preferences, categories and quiet hours **before** dispatch. Opt-out is
honoured immediately. Delivery status, provider ID and failure reason are logged for
support.

---

## 5. Accessibility Baseline

- All interactive controls keyboard accessible (dashboard) and screen-reader labelled (both)
- Visible focus indicators
- Never communicate a validation error or a status by colour alone — pair with text or icon
- Adequate tap targets and text sizing
- Respect reduced-motion preferences
- Animation is never the only progress indicator
- Consent and privacy screens written at a beginner reading level

---

## 6. Platform Split

| Surface | Styling |
| --- | --- |
| `apps/dashboard` | Tailwind CSS, semantic tokens in `globals.css` — see `03_PURPOSEMINT_TAILWIND_GUIDE.md` |
| `apps/mobile` | React Native `StyleSheet` + a shared token module |

Mobile never imports dashboard CSS or Tailwind classes. NativeWind is not adopted; it would
require an explicit decision, and reusing the dashboard's Tailwind config is not a valid
reason since web and native components remain different.

Shared *values* (hex codes, spacing scale, typography scale) may later live in a
platform-neutral token package. Shared *components* may not.
