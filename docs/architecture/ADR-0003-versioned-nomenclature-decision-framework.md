# ADR-0003 — Versioned and independently reviewed nomenclature decisions

**Status: Proposed implementation, not clinical authorization**  
**Date: 2026-10-14**  
**Deployment: Not connected to the user interface, Supabase, or production**

Phase 2G adds `nomenclatureGovernance.ts` and an explicitly disabled `nomenclatureRegister.ts`. They define proposal revision, authoritative reference/version, stable variant identity, versioned reference sequence, independent scientific + engineering approvals (or privacy + engineering for search policy), approval date, rationale, supersession and release activation boundaries.

No approved CFTR aliases are committed. The three open NFQ-NOM/GATE items are proposals with no target, no citations and no reviewer signatures. The presence of a field labelled `approved` in a schema does **not** mean this repository authenticates approvals or meets clinical governance obligations.

The pure evaluator is **fail closed**: release activation, no pending decisions, schema validity, evidence, reviewer separation, versioned accession and unique alias identity must all pass before test-only exact resolution is possible. The clinical application does not import or execute this feature.

## Further production gates

1. Authoritative, date/versioned biomedical reference, relevant transcript sequence context, unambiguous variant identity and synonym provenance.
2. Authenticated reviewer identities and immutable attestations in a trusted backend, with role enforcement and independent approvals.
3. Append-only versioned decisions and change history, rejection/supersession workflow and auditable rollbacks. A static TypeScript array does not enforce immutability or authentication.
4. Discrepancy review against the legacy 52-case differential suite and independent expert-selected negative controls.
5. Deployment approval separate from scientific approval; never enable the ruleset by merely flipping the `activation` literal without controlled release governance.
6. Separate legal/privacy approval before storing any search-related user or institution metadata.

## Design restrictions

- Search synonyms cannot determine pathogenicity, phenotype, eligibility for CFTR modulators, or clinical genotype.
- No unversioned accession, fuzzy medical identity assignment, implicit chain of aliases, or unreviewed source can become an approved mapping.
- Greek uppercase/lowercase delta are equivalent under case folding; this makes collision handling and scientific normalization review mandatory.
- Deployment to real clinical workflows remains blocked.
