# Phase 2E — Expanded Scientific Search Reference Corpus

**Date:** 2026-10-14 · **Status:** controlled engineering characterization, NOT clinical validation.

## Scope and evidence

Phase 2C/2D tested 15 queries against a frozen extraction of the actual legacy search engine and an independent TypeScript implementation. Phase 2E expands the corpus to **52 distinct queries** across **12 controlled reference-style records**, including original 15 cases, HGVS-like protein/cDNA, legacy splice notations, case, aliases, numbers, repeated and multi-term compound input, and malformed/prose input. The records are synthetic test objects and contain **no clinical classification or patient data**.

The differential comparison on the initial expanded PR run produced **49 matching cases and 3 differences**:

- `ΔF508`: existing uppercase Greek-delta result mismatch — pending scientific review.
- `δF508`: **newly discovered** lowercase Greek-delta result mismatch — pending scientific review.
- `patient treatment report`: existing difference in UI structural gate semantics — pending product/security policy review.

No new approved clinical normalization is asserted. Search-result equivalence does not imply validation of variant identity, pathogenicity, treatment eligibility, phenotype, or genotype.

## Regression strategy

- Every query is exercised with the SHA-pinned legacy function oracle and modern TypeScript search using **the same synthetic records**.
- Both identities/order, normalized query and structural rejection are compared.
- Only three explicitly registered **pending review** discrepancies are tolerated by the engineering gate. Unregistered or changed discrepancies cause CI failure.
- An extra unit test locks the corpus cardinality, uniqueness, categories, controlled data type and known exception set.
- A GitHub Actions artifact contains the query-level comparisons. No exceptions are silently hidden.

## Known limitations and non-goals

This is an offline *engineering* comparison, not a clinically validated reference dataset. Some nomenclature-like strings are historical/common aliases with uncertain equivalence; it would be inappropriate to infer a patient's specific genotype or clinical effects from these tests. Direct external authorities, Supabase records, institution-specific clinical validation and licensed-source terms are not exercised. No production app, CNAME, database, or Vercel build settings were changed.

## Next gate

Scientist/clinician review of nomenclature transformations and a separately versioned test oracle for **intended** normalization. In particular, do not conflate the request to find `ΔF508` with a proven algorithmic equivalence rule without reviewing transcript/nomenclature context. We must retain differential exceptions until each change is formally approved with an independent golden test.
