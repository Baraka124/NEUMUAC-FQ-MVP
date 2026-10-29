# Phase 14H2 — Historical ETI response in the variant dossier

**NFQ-015 / NFQ-026:** the first clinician-visible recovery of the original recorded ETI response fields. This is source preservation and research navigation, **not** scientific endorsement of the original categorical values.

## Behavior

- For every independently selected, exact-ID variant, request a separate GET-only historical response projection from the existing research database.
- Render **ETI response · original register** near nomenclature and classification. Keep the historical `responsive`, `non_responsive`, and `unknown` codes distinguishable.
- Display the old boolean `therapy_responsive` only in expanded source details, using `Yes/No · historical flag`, not as a clinical binary classification.
- Show recorded ETI evidence level/tier, source label, CFTR2 response, and last evidence update as metadata. Link to the existing variant-scoped evidence register.
- Cancel stale requests when the selection changes; distinguish inaccessible, missing, unloaded, and available data. No fabricated status or synthetic source records.
- Keep interaction concise on mobile and desktop; provenance details use an accessible `<details>` disclosure.

## Database findings / limits

Live metadata inspection found 2,234 `variants` rows with legacy ETI category codes (`responsive` 209, `non_responsive` 1,106, `unknown` 919) but only 15 `variant_evidence` rows, 14 with an ETI-specific response field. The old `therapy_responsive` boolean contains 19 true and 2,215 false values. These are **not equivalent denominators**, and no response/indication conclusion should be drawn from their comparison.

The legacy `eti_evidence_level` field has mixed codes and 1,246 missing records. Its meaning and cited source dates have not been verified. No drug recommendation, patient eligibility, source-to-claim inference or regulatory update is performed.

## Release / acceptance boundary

Phase 14H2 passes implementation only after Vue typecheck, unit tests, differential regression, build, and browser smoke. Production acceptance requires a deployed read connection, side-by-side verification with the original for representative recorded categories (including disagreements), clinician sign-off, and source citation reconciliation. Keep the legacy parity register status pending until those conditions are met.

No Supabase writes, new RLS permissions, paid staging, Helios approval, geographic hit/miss recording, or changes to frozen `index.1.html` are part of this phase.
