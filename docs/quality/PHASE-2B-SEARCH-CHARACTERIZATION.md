# Phase 2B — Scientific Search Characterization (controlled, nonclinical)

**Source baseline:** legacy root `index.html`, blob `c18221fb6baf47782318ca3685b94b088c359a66`. **Production code:** unchanged.

## Scope

This phase introduces the first isolated, deterministic TypeScript search engine and tests. It operates **only on in-memory fixtures** and must not be treated as scientifically validated HGVS nomenclature software or as proven parity with the original code.

The legacy engine (`searchVariants`, approximately L12785–12959) performs normalization, exact/prefix/substring matching, phonetic and Levenshtein tiers, compound terms, search gate checks, indexed metadata, clinical-relevance tie breaking, analytics logging and broader query-resolution behavior. The TypeScript module `src/domain/searchParity.ts` characterizes a **controlled subset** only. The new UI's current nonclinical search remains separate; no live data source or user behavior is replaced in this phase.

## Characterization coverage

- Case insensitive identity and alias search
- Three-letter amino acid abbreviation; delta / deletion spelling and HGVS prefix removal
- Positional lookup shortcuts
- Numeric, exact, prefix, substring, edit-distance and phonetic matching with ordered tiers
- Compound search with duplicate record suppression
- Some structurally invalid queries
- Read-only in-memory operation with no search log persistence

## First confirmed discrepancy

The legacy-inspired normalization transforms `ΔF508` into `delf508`, which is not identical to `f508del`. This is recorded as **non-parity for a canonical clinical synonym** and must receive an explicitly approved normalization correction with differential tests. We are not importing the discrepancy as a clinical rule.

## Explicit parity gaps (must not be silently approved)

1. No equivalence proof for all legacy aliases, including positional/eponymic shortcuts; some colloquial associations may be scientifically misleading.
2. Real Supabase `variants` dataset and server-side fields not available for parity comparison.
3. No legacy clinical relevance score tie-break, filtered classification search, search index metadata, search analytics or persistence/debounce gates.
4. No complete variant-name validator, uncertainty handling for uncertain nomenclature, VCF input, HGVS transcript identifiers, nor clinician validation.
5. Pure input normalization can collapse biologically distinct values; any canonicalization that impacts clinical decision support needs review against authoritative variant nomenclature.
6. No production Supabase, authenticated data, actual patient identifiers, or clinical classifications used in tests.

## Safety and approval gates

- Characterization tests must pass in CI alongside existing Vue/Playwright and legacy integrity checks.
- Additional real-world **nonidentifying** curated reference vectors are needed before claiming search parity.
- Differential test against a controlled legacy oracle under offline synthetic fixtures; report mismatches instead of normalizing them away.
- Review all alias transformations and especially colloquial/eponymic mappings with scientific domain experts.
- Explicit label `legacy-inspired / controlled subset`; do not enable real dataset search until parity and authorization gates are met.

## Next scoped phase

Phase 2C should build a differential oracle harness and a fixture corpus that exercises known errors, exact HGVS and compound/structured filter cases. Only then should the new UI adopt the search implementation for demonstration records; this change is not made here.
