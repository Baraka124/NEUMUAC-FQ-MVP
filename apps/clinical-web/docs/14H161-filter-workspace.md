# 14H161 · Filters as a dedicated workspace, not a popover over search

The user screenshot shows the **Batch lookup** action physically overlapping the first variant result and the previous Filters panel covering the search/result area when opened. The original 14H153 `VariantFilterPanel` used `position:absolute` anchored to the Filters button. On a 300–340px search rail it opened into the same working area.

## Implemented behavior

- At **≥1001px**, where the original `.record-layout` is two-column, Filters opens as a proper **right-column sidecar** above the existing scientific dossier. The left search rail, its results, batch action and query remain completely unobstructed. Closing the filters restores the original two-column layout; no extra module is introduced.
- At **≤1000px**, where the existing layout becomes single-column, the same state-driven filter appears **inline immediately beneath the actions**, in normal document flow, before results—not an absolute overlay or fullscreen modal. Exactly one panel instance is mounted at a time across viewport changes.
- A two-column action grid keeps Filters, Saved, Batch lookup and optional My session within their cells, with the page count on its own row. No wrap/overlap into results.
- The scientific meaning and underlying live filter parameters are identical: original class/subtype, independent ETI vs Alyftrek recorded responses, sort and exact/name matching, reset and immediate updating remain.
- Daylight/Midnight, keyboard accessibility, 40px action targets and compact quiet blue controls remain; no heavy filled buttons.

## Acceptance

The added Playwright test covers 320, 390, 768, 1024 and 1366px, both themes, positioning, nonintersection with search controls, always-accessible batch lookup, preserved search origin, immediate filter effect, closing and no horizontal page overflow. Existing full search, batch, five-treatment, permission, curation and legacy suites remain required.

This phase changes only presentation and test code, not Supabase, scientific records, therapy rules, variant search APIs, read access, role checks, or archived original HTML.
