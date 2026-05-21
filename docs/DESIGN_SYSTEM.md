# ADGA Suite Design System

This is the source of truth for the ADGA Suite product and marketing visual system. New work must follow this file before adding page-specific CSS.

## 1. Visual Theme And Atmosphere

ADGA Suite should feel like a premium operating system for deal work: controlled, direct, spacious where it matters, dense where users are scanning records. It should not feel like a magazine, editorial site, dark-mode AI demo, or generic corporate SaaS template.

- Density: balanced-to-dense for the app, calmer for marketing.
- Variance: restrained asymmetry, never decorative chaos.
- Motion: minimal, tactile, purposeful.
- Tone: confident, modern, useful, expensive.

## 2. Color Palette And Roles

- Command Canvas `#F6F6F3` — main page background.
- Pure Surface `#FFFFFF` — cards, drawers, forms, table panels.
- Raised Surface `#EFEFEB` — secondary panels, filters, input fill.
- Charcoal Ink `#191A1D` — primary text, never pure black.
- Steel Text `#4F5157` — secondary text and descriptions.
- Muted Graphite `#7D8089` — metadata, timestamps, disabled text.
- Structural Border `#DEDED7` — default border.
- Strong Border `#C4C5BC` — active borders and table rules.
- ADGA Ink `#202124` — primary actions, active states, focus rings, and selected navigation.
- Ink Soft `rgba(32, 33, 36, 0.08)` — subtle active background.

No purple-first palette. No neon glow. No beige editorial palette. No pure black.

## 3. Typography Rules

- Display: Geist, 600-700 weight, tight but not compressed.
- Body: Geist, 400-500 weight, 1.5-1.65 line height.
- Mono: Geist Mono for dates, amounts, IDs, counts, and compact metadata.
- Dashboard/UI rule: sans-serif only.
- Serif rule: do not use serif type in the app. Marketing may not use cursive/editorial serif styling unless explicitly approved later.
- Letter spacing: normal for normal text. Uppercase labels may use `0.08em`, not more.

## 4. Component Styling

- Buttons: 6-8px radius, no glow, no decorative icons unless the icon is a standard tool/action symbol.
- Cards: only for real grouped information. Do not nest cards inside cards.
- Inputs: label above, visible focus ring, full-width in forms, minimum 40px height.
- Filters: dropdowns, search inputs, segmented controls. Do not use long chip rails for scalable datasets.
- Tables/lists: content first. Do not push records below KPI blocks.
- Empty states: direct next action, no whimsical copy.

## 5. Layout Principles

- Marketing pages and app must share the same palette, type, radius, and button behavior.
- App screens prioritize records and workflows over decorative panels.
- Story selectors must scale to hundreds of clients, contacts, and deals using search and dropdown controls.
- Page sections use max-width containment and consistent spacing.
- Mobile collapses to one column. No horizontal scroll as primary navigation.

## 6. Motion And Interaction

- Use only opacity and transform transitions.
- Hover states should be subtle: border color, background tint, or small translate.
- Avoid motion that distracts from data entry or deal review.

## 7. Banned Patterns

- No editorial/magazine language as product framing: ledger, issue, reader, cover plate, under glass, leisure.
- No serif/cursive UI typography.
- No purple neon, blobs, or decorative gradients.
- No chip rails for selecting large datasets.
- No three-card filler sections unless the content truly requires three comparable items.
- No fake statistics.
- No standalone features without agent/workflow/state ownership.
