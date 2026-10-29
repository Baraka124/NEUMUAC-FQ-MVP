# Phase 14H6 — Source response visual refinement

## Corrected
- Replaces a nested stack of source disclaimers, duplicate titles, and parity warnings with a compact source list aligned beside the ETI category.
- Displays source rows only when returned by the existing real read-only database connection. No source record produces a plain, factual empty state.
- Shows Alyftrek only when a source-specific response field actually exists; never fabricates a response.
- A recorded contradiction receives a visible, restrained explanation and original row references. Matching records receive an unobtrusive note. Empty/unknown records are not incorrectly called verified.
- Keeps links conditional on real approved source URLs, while clearly identifying source entries without a document URL.
- Provides single-column layout at tablet/mobile widths and compact typography consistent with the dossier.

## Acceptance
Automated typecheck, domain-unit tests, regression suites, build and browser smoke must pass. Opt-in live acceptance uses existing source record IDs including unknown #44, nonresponsive #7 and contradictory #14. The production deployment and clinician visual review must be verified separately before calling the UI accepted.

Historical database values, RLS permissions, Helios and geographic recording are unchanged.
