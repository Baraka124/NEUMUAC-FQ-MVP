# neumuacFQ · 14H202–203 · Scientific benchmark reproducibility and deployment gate

## 14H202 — Authorization and publication-integrity gate

The proposed schema `supabase/proposed/20261118124500_nfq_expert_reference_registry_v1.sql` has been strengthened against automatic claims of validation. It now checks:

- Existing, authenticated active session and research-role membership; reviewer and mapping roles remain separate.
- Exactly two independently authored publication extractions before mapping.
- Independent adjudication if the reviewers disagree on the scientific finding, genotype, endpoint, study context or source claim.
- Exact linkage of selected variant, source reference, PubMed identifier and the original review-approved source claim.
- Genotype-specific trial scope and trial-specific therapy ID for G551D/ivacaftor and Phe508del/minimal-function/ETI references.
- Exact source-reported endpoint code and timepoint; no arbitrary pooling.
- Categorical refusal to convert the c.1584G>A/1716G/A complex synonymous-allele splicing paper into therapeutic-response evidence.
- Private evidence tables with RLS, direct table grants revoked and RPC-only access through an authorized session.

`supabase/tests/14h202_expert_registry_security.sql` provides rollback-only table/RLS/grant checks **to run against a separate staging project**, after deploying the reviewed migration there. It has **not** been run against a migrated database, because the currently connected CFTR Supabase project is live and no dedicated CF staging project was identified.

Static test `expertRegistryMigrationContract.test.ts` checks that these explicit safeguards remain in source on subsequent refactors. Static tests are not substitutes for actual database authorization tests.

## 14H203 — Deterministic benchmark ledger

The read-only `buildScientificBenchmarkLedger` function:
- Includes each unique anchored publication/internal variant pair at most once.
- Keeps missing expert extracts, unresolved disagreements, incompatible context and missing platform evidence in explicit denominator categories.
- Uses the three existing authentic PubMed bibliography anchors from 14H194–195; does not create synthetic clinical papers, trial outcomes or patient entries.
- Produces deterministically ordered case rows, full status counts and explicit missing-evidence states.
- **Always withholds agreement-rate and scientific-accuracy certification** (`agreementRate:null`, `scientificAccuracyValidated:false`), because no blinded human reference extraction or external sign-off has been verified.

## Release blockers

1. Verify proposed RPC SQL against an isolated CF staging database. Include Postgres transaction, mutation/replay, two-reviewer concurrency, RLS and role-based authorization tests. Do not execute these experimental writes in production.
2. The frontend registry now checks individual source identities, reviewer separation and audit continuity. Before clinical integration, verify that these checks agree with actual staging RPC responses, including timestamps and permission-denied cases.
3. Review source-claim linkage to the primary publication including a curator-verifiable figure/page or trial locator.
4. Obtain real independent expert extractions and document reviewer disagreement/adjudication.
5. Only then consider a trusted, versioned mapping and reproducible comparison report. Never infer clinical drug responsiveness from bibliographic evidence.

## Verification status

CI checks new Vitest domain and static-contract fixtures. Passing CI means the **software constraints** pass, not that the science has been validated. No production migrations have been applied or clinical records changed in this phase.
