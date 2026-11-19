# neumuacFQ · Editorial E01 — Clinical design foundation

## Baseline

Starting point: scientific PR #382 squash-merged into main at commit `7b435e8c48573d16ea246a9ae24292ae2f57e3f3`. This phase changes no scientific computation, rules, genotype evidence, authentication, database access or historic original HTML.

## Implemented

- Added `clinical-editorial-foundation.css`, loaded last from `main.ts`. It establishes shared tokens for ink, neutral paper/canvas, cobalt accent, borders, keyboard focus, hover and radius.
- Maintains **both** original light and midnight modes without changing their switch, persistent preference or functional behavior.
- A calibrated IBM Plex Sans / system font hierarchy with restrained weight and tracking; headings remain compact and research-forward.
- Consistent UI controls, optical borders, professional neutral surfaces and interaction feedback, with accessible focus-visible indicators and reduced motion.
- Small screens retain mobile interaction sizing and safe space for clinical controls.
- Clinical-response/status styling is explicitly out of scope: ETI/Alyftrek interpretations, mutation badges and primary scientific data are left intact.
- Added an E01 unit guard for import ordering, themes, keyboard/reduced motion and the separation of visual tokens from scientific status.

## E02 scope

Refine controls individually after checking module structure: primary/secondary buttons, filter placement, dropdowns, evidence tables, contextual info, dialogs and compact navigation. Favor correct semantics and state behavior over generic global styling.

## E03 and freeze

Apply consistency across the entire research catalogue and all secondary/openable surfaces, validate responsive screens, run interaction and Playwright visual regression checks, then freeze editorial v1. No endless cosmetic iteration without explicit findings.
