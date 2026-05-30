# CSS architecture — ADGA Suite

> Read this before changing any CSS in this folder.

## Cascade order (from `app/globals.css`)

```
@import "tailwindcss"                       # base, utility layer
@import "../components/adga/marketing.css"  # marketing/landing styles
@import "../components/adga/styles.css"     # premium polish + suite shell base
@import "../components/adga/styles-v4.css"  # suite v4 styles
@import "../components/adga/design-system.css"   # design tokens (--accent, etc.)
@import "../components/adga/final-overrides.css" # responsive layout overrides (intentional)
```

Then `app/globals.css` itself adds its own 7,634-line body of styles **after** the imports.

Later files (lower in the list, and globals.css itself) win cascade ties.

## What each file owns

| File | Lines | !important | Role |
|---|---|---|---|
| `globals.css` (this entry point) | 7,634 | 736 | The monolith. Hero, motion, suite shell layouts, responsive contract, rail behavior, dealflow mode. Every "final pass" override layer in the file is intentional cascade hammering against earlier imports. |
| `marketing.css` | 1,637 | 6 | Public site styling (hero, pricing, sections). |
| `styles.css` | 155 | 0 | Suite shell base — `.suite-shell`, `.app` grid, `.workspace`. Foundation that the v4 builds on. |
| `styles-v4.css` | 2,274 | 144 | Suite v4 layer. Supersedes earlier suite styles for most selectors but not all (6 selectors are unique to `styles.css`: `.agent-rail`, `.field`, `.pulse`, `.suite-loader`, `.suite-shell`, `.workspace`). |
| `design-system.css` | 432 | 0 | Design tokens (CSS custom properties). Single source for `--accent`, spacing, radii. |
| `final-overrides.css` | 149 | 56 | Per-breakpoint layout hammers. The `!important` here is doing real work — it overrides earlier suite styles that fight the responsive grid at `>= 1024px` and `<= 1023px`. Removing it breaks page-h alignment, kanban scrolling, and subtab layout. |

## Rules for changing CSS in this folder

1. **Run `npm run css:audit` before AND after any change.** The baseline lives in `.css-audit.json`. Cleanup should reduce `!important` count and/or `lines` total without changing selector count materially.

2. **Visual regression is mandatory.** Screenshot every `/suite/*` route with the operator session cookie before and after. If you don't, you will silently break a layout at one breakpoint and not notice for a week.

3. **Do not move rules between files without checking cascade order.** A `!important` rule in `final-overrides.css` survives because it loads last. Moving it earlier without changing specificity will silently weaken it.

4. **Do not delete `styles.css`.** Six selectors there are not replicated in `styles-v4.css`.

5. **Do not delete `final-overrides.css`.** Every rule in it is a deliberate hammer against an earlier layer.

## Real cleanup work (sequenced)

The actual debt is in `globals.css` — 7,634 lines split into a half-dozen "final pass" sections that accumulated over time. Future work, in order:

1. **Split `globals.css` by section.** Each commented section (`Motion layer`, `Hero v2`, `Suite shell layout contract`, `Suite-shell responsive contract`, etc.) becomes its own file. No content changes, only physical reorg. Cascade order preserved by import order.
2. **Resolve the duplicate "final" sections.** Lines 5188+ and 7066+ both call themselves "ADGA Suite refinement layer". Identify which selectors are duplicated and merge.
3. **Replace `!important` clusters with specificity bumps.** Where two rules fight (`.foo` vs `.suite-shell .foo`), the more-specific one wins without needing `!important`.

Each step independently visually-tested.
