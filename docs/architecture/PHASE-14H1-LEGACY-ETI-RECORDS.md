# Phase 14H1 — Literal legacy ETI response parity (NFQ-015)

## Source inspection
Read-only metadata inspection of the existing Cystic Fibrosis project identified:
- `public.variants`: 2,234 variant records. `therapy_responsive` is populated for all rows: 19 true / 2,215 false.
- `eti_prediction`: 209 `responsive`, 1,106 `non_responsive`, 919 `unknown`.
- `eti_evidence_level`: inconsistent/missing in the original data; keep literal vocabulary, no inferred verification.
- `public.variant_evidence`: 15 rows (14 with ETI response fields) for only 15 variant IDs.

These counts are an inventory of **recorded database fields**, not measured response prevalence or confirmed treatment efficacy. In particular, treating 2,215 `false` flags as validated nonresponders would be a serious migration error. The original field semantics and source-level attestations still require scientific reconciliation.

## Delivered
- GET-only, exact-ID Supabase REST adapter to the existing `variants` table, using only selected legacy response metadata.
- Typed response decoder, explicit null/unknown differentiation, strict schema and ID rejection, browser-safe error boundaries.
- Read access via the existing publishable key and optional signed-in staff JWT, leaving all permissions and RLS unchanged.
- No ETI recommendation algorithm or transformation of the historical flag into treatment eligibility.
- Unit tests for recorded states, disagreement, invalid fields, malformed pages, unauthorized reads and authenticated header behavior.

## Next phase 14H2
Connect the projected fields into the variant dossier as a visibly labeled **historical recorded classification** with provenance and explicit evidence limitations. No original `index.1.html` changes; no geographic events or Helios writes.
