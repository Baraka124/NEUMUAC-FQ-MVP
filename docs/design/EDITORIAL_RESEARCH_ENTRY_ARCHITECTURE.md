# neumuacFQ · Research entry / Editorial product architecture

## Editorial intent

neumuacFQ is not a dashboard of invented KPIs. It is a connected scientific investigation tool. Its first internal workspace must foreground a real starting task and then expose the strongest available scientific journeys.

**Task order:** locate a recorded CFTR variant → examine a recorded genotype context → inspect source-bound evidence → evaluate research coverage and missing documentation. No stage implies a treatment-response determination or clinical approval.

## Implemented in the Vue research entry

- Preserve the existing **Search CFTR variants** form, original exact alias/HGVS semantics, bounded search control dimensions and linked route/query behavior.
- Retain direct variant-record, Class I, and geography links.
- Add an integrated editorial pathway index (not a stack of large generic cards) linking to the existing genotype, evidence and research-coverage routes.
- Prioritize readable headings, discreet topic labels, thin structural separators, responsive navigation and keyboard-focus affordances.
- Show no fabricated counts, no fake researcher activity, no generated variant evidence and no new role or therapy claims.
- Respect daylight/midnight via existing authored variables; no separate palette or duplicate global override stylesheet.
- Keep dense desktop composition and a single column for small screens.

## Validation

The added Playwright acceptance test verifies real routes and navigation, semantic pathway link labels and containment at 320, 390, 768, 1024 and 1366px. Existing clinical-foundation browser tests continue to enforce the original search button dimensions, transparent idle controls, daylight/midnight contrast, and scientific-data boundaries.

**Scope:** only the research entry view and its related acceptance test/documentation. The original index.html, patient data, therapy logic, Supabase permissions and scientific reviews are unchanged.

## Human optical acceptance remains separate

Verify the actual rendered entrance and all linked destinations at desktop/mobile before design sign-off: whether the reading order is immediately understandable; whether pathways are genuinely discoverable without dominating search; whether focus/hover and light/midnight states look intentional; and whether no element feels like unnecessary product chrome. A green browser suite protects functionality but is not a substitute for this review.
