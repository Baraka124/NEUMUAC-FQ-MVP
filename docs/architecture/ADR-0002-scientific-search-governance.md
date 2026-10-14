# ADR-0002 — Search usability, analytics eligibility and nomenclature approval

**Status:** Proposed / engineering policy only  
**Date:** 2026-10-14  
**Scope:** isolated clinical-web domain package; production remains on the frozen legacy root index.html.

## Decision

1. Treat query execution, analytics eligibility and persistence authorization as **three independent trust boundaries**.
2. Search remains available for variant-like input regardless of whether analytics collection is permitted. Rejected pasted content must produce an explained, non-persistent outcome; **never** become a clinical conclusion.
3. Analytics eligibility defaults to **false** and requires explicit feature enablement, approved purpose/lawful basis, minimization and actor authorization. The Phase 2F code returns a candidate decision and intentionally implements **no persistence**.
4. Keep source nomenclature normalization in a versioned proposal/decision register. None of the observed Greek-delta mapping discrepancies may be called medically approved on the basis of a passing unit or differential test.
5. Keep the Phase 2E strict differential engine behavior unchanged. Pending deviations remain tracked, not silently reconciled.

## Evidence

Legacy `SEARCH_GATE` in root index.html has `structuralCheck`, `plausibilityCheck` and `persistenceCheck`, while `searchVariants` carries a separate pre-resolution path. It converts Greek delta to `del` before synonym mapping; the offline differential harness records discrepant result IDs for `ΔF508` and `δF508`.

## Nomenclature governance process

For each proposed transform record: original raw notation, reference transcript/accession where applicable, proposed display label, matched identity, evidence source and version, transformation rationale, owner, clinical reviewer, date, acceptance fixtures, rollback and deployment scope. Never equate search synonym matching with pathogenicity, phenotype, modulator eligibility or biallelic interpretation.

## Review requirements

- Clinical or scientific reviewer validates intended nomenclature equivalence using an authoritative source and version.
- Engineering reviewer validates exact, ambiguous, negative, fuzzy and compound test cases.
- Privacy/data owner approves analytics purpose, minimization and retention separately.
- No code is connected to real data, patient identifiers or production until all relevant release gates are met.

## Alternatives rejected

- Treat every successful search as consent to log it — rejected: privacy and governance risk.
- Copy all legacy eponymic shortcuts as authoritative identity mappings — rejected: poor provenance and ambiguity.
- Remove the two Greek-delta exceptions to improve CI statistics — rejected: would obscure unreviewed scientific change.

## Deferred

Actual normalization repair, production integration, telemetry, opt-in analytics collection, per-tenant authorization and clinical validation. Those require separate implementation/approval.
