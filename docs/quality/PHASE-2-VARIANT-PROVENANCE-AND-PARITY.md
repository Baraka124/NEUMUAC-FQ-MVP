# Phase 2 — Variant Workspace, Provenance and Scientific Parity Boundaries

**Status:** Synthetic read-only UI implementation. **Production:** unchanged root `index.html` and `CNAME`.

## Implemented

- Typed research record contracts, separately tracking record review state, evidence review status, nomenclature and source provenance.
- A read-only reference repository with wholly fictional DEMO-CFTR identifiers; no live scientific conclusions or patient information.
- Deterministic, explicitly simplified search ranking (exact > prefix > substring), classifiable result state and review filters.
- A coherent worklist/record-detail/evidence-register/history layout, accessible search and navigable record URLs.
- Responsive 390/768/1366 workflows and absence-of-evidence semantics.

## Not migrated, and not validated

The legacy `searchVariants` algorithm has a sophisticated normalization and gate pipeline including compound search, HGVS variation, aliases, numeric match, phonetics, edit-distance fuzzy search, tier scoring, clinical relevance ordering and analytics logging. The Phase 2 demo is **not equivalent** to this legacy behavior.

Scientific provenance in the legacy app includes direct ClinVar API queries and a locally curated proxy for CFTR2-related authority signals; the new type system explicitly distinguishes those source classes but **does not fetch either**. All current evidence entries are labelled synthetic.

Clinical classification, ETI eligibility, treatment recommendations, genotype assessment, Helios approval, role authorization, audit immutability and live database queries are not implemented.

## Scientific parity acceptance before any clinical data cutover

- Golden fixtures for common CFTR names (legacy, protein and cDNA), Greek delta, amino acid 3-letter normalization, IVS/splice and HGVS syntax.
- Structured filter semantics, compound query hits/misses and rejected prose/URL patterns.
- Tier order exact/prefix/substring/fuzzy/phonetic, case-insensitivity and stable tie ranking.
- Explicit distinction between a search miss, missing evidence, not-reviewed evidence and clinically validated records.
- Evidence-source verification by authority, source version, date, conflict status and provenance.
- Read/write authorization and row-level security evidenced server-side; no clinical write or review approval before that gate.
- Cross-browser and screen-reader verification plus clinical expert sign-off on labels and apparent certainty.
- Disconnected/offline behavior, stale data visibility and safe result navigation.

## Implementation scope contract

Do not replace the production root app or connect the Vue prototype to live Supabase merely because the UI tests pass. Phase 2 tests prove synthetic display and navigation only. Exact scientific rule reimplementation requires a separate domain test phase, independent clinical review and explicit version-controlled decisions.

## Next phase

Phase 2B: scientific-search characterization tests from verified legacy examples, UI feedback, then accessible focus/back navigation improvements; Phase 3: scoped migration of read-only, authenticated production-compatible variant APIs **after** security/data-owner approval.
