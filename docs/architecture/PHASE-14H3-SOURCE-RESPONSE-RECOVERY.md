# Phase 14H3 — Original source-specific modulator records

## Verified live schema inventory (read-only, 29 October 2026)

The Cystic Fibrosis database has `variant_evidence` (15 rows, 15 variant IDs) linked by foreign keys to `variants` and `evidence_sources`. Of those 15 rows, 14 have a literal ETI response: seven `responsive`, seven `non_responsive`; none have an Alyftrek response. All fifteen source references resolve to an `evidence_sources` row, currently referencing one historical research-paper source. The source register contains six rows overall.

**All six `evidence_sources.url` values are null.** This register provides named historical source attribution, not individually verified citations or document-level proof. Its `source_type` and year are original labels, not scientific-methodology verification. The established `evidence_links` register is a separate source list: record-specific linkage cannot be inferred from titles or shared source keys.

## Delivered

- Read-only adapter requests `variant_evidence` for the independently verified variant ID and retrieves only the referenced `evidence_sources` rows.
- Preserve original ETI and Alyftrek response labels separately; keep missing, unknown and denied states distinct.
- Strict bounded responses, identity checks, source foreign-key checks, source metadata validation, scoped fetches, and no truncated evidence presented as complete.
- No source note, clinician identity or patient field is requested. No HTML, mutation, treatment inference, or geographic recording.
- This adapter does not populate the stricter `modulatorEvidence.ts` contract, which requires independently verified document URLs, method and review provenance. It remains a **legacy-source projection**.

## Phase 14H4

Surface the per-source rows in the dossier and implement an explicit original-field parity matrix, including `responsive`, `non_responsive`, `unknown`, boolean disagreement, and inter-source disagreement. Automated tests do not replace live deployment comparison or clinical assessment.
