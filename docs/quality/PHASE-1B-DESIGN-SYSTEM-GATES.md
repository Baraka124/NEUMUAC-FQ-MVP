# Phase 1B — Clinical Design Foundation and Interaction Gates

**Scope:** design and interaction quality inside `apps/clinical-web` only. Root `index.html` and `CNAME` remain unchanged. This is a synthetic-data prototype, not a regulated or production clinical application.

## Design intent

Move from generic dark analytics to a calm editorial clinical environment. Clear workspace identity, one visible hierarchy, improved typography, restrained status colors, responsive navigation, measurable focus behavior and no excessive dashboard counters. Component semantics and workspace structure precede visual effects.

## Interaction acceptance

- Header, side rail and worklist have clear visual hierarchy and one navigational meaning each.
- Desktop: 1366 × 900; tablet: 768 × 1024; mobile: 390 × 844.
- Responsive navigation is accessible and usable on narrow viewports without trapping focus or hiding available workspaces.
- Synthetic search is case-insensitive; selected route renders appropriate record; absent record remains explicitly synthetic.
- Reserved Helios, evidence and genotype routes have clear non-functional disclaimers.
- No horizontal document overflow at tested widths.
- Keyboard skip-to-main works; focus indicators are visible; reduced motion is respected.
- No production Supabase API connections or treatment recommendations are introduced.

## Automated gates

The `Vue TypeScript / check` workflow must pass TypeScript, unit tests and build. The `Clinical browser / smoke` job runs Playwright Chromium at three viewports against a localhost Vite server; it does not reach clinical backend services. Legacy integrity must remain green.

## Intentionally outstanding

Authenticated clinician/curator sessions; complete aria audits; screenreader use; real variant data parity; RLS/security; desktop browser matrix; production deployment acceptance; Helios concurrency; evidence clinical validation; full design approval after live visual review. These remain later-phase gates.
