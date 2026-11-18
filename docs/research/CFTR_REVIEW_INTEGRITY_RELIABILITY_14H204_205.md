# neumuacFQ · 14H204–205 · Review-chain integrity and publication reliability

## Purpose
Move the research-only CFTR evidence benchmark from syntactically valid records to an independently auditable workflow, without implying that a trial result validates single-allele efficacy. No UI or therapy-engine changes are part of these phases.

## 14H204: independent-review workflow audit
`apps/clinical-web/src/domain/expertReviewWorkflowAudit.ts` creates a deterministic, read-only snapshot of the trusted expert registry. It verifies:
- Exact publication challenge, PMID and catalogue variant correspondence.
- Zero, one, or two distinct expert source submissions, with explicit pending states.
- Disagreements in genotype context, experimental endpoint, study model, source locator, interpretation and linked claim.
- A third, independent adjudicator only after both reviewed submissions, with a distinct actor and later timestamp.
- Mapping to a platform evidence claim only after resolution and a separate attestation.
- One matching immutable event for every extraction, adjudication and mapping submission, with consistent actor and timestamp.

The validation result is a **workflow state**, not proof of scientific correctness. The `externallyValidated` flag remains `false`. Server-side verification of JWT, active researcher membership and transaction isolation is still required.

## 14H205: publication reliability accounting
`apps/clinical-web/src/domain/publicationReliabilityReport.ts` creates a case-by-case report from the deterministic benchmark ledger:
- Statuses include agreement, disagreement, indeterminate, unresolved review, missing evidence and incompatible scientific context.
- Every included challenge contributes to the denominator, even when no reviewed claim exists.
- Cases are grouped by the original PubMed anchor; counts and identity are checked against the source ledger.
- Summary rows are sorted deterministically so CI snapshots can be reproduced across runs.
- Accuracy, sensitivity and specificity stay `null`, because genuine independently adjudicated ground truth and an adequately designed validation sample are not yet present.
- No patient response estimate, treatment eligibility, mutation classification or causal assertion is made.

## Deployment and acceptance gates
1. Continue to **withhold deployment** of the proposed SQL in the active Cystic Fibrosis Supabase project. A dedicated CF staging project was not identified in the linked account.
2. Run the proposed migration plus `supabase/tests/14h202_expert_registry_security.sql` against an isolated staging database, then execute authenticated role, concurrency, immutable-audit, and adverse-input transaction tests.
3. Obtain two qualified *independent* expert source reviews for each anchored original paper and log disagreement/adjudication with source locators and reproducible versions.
4. Verify primary publication-to-approved-source-claim provenance and exact genotype/endpoint scope for each included case.
5. Re-evaluate the handling of adjudicated scientific-context disagreements before deriving comparative results; a third reviewer decision does not magically make incompatible experimental systems comparable.
6. Collect prospective expert decisions before calculating empirical performance statistics. They are intentionally not provided by these software tests.

## Testing
Added `expertReviewWorkflowAudit.test.ts` and `publicationReliabilityReport.test.ts` with synthetic **software-boundary** fixtures. Passing tests means workflow rules and ledger accounting were exercised; it does not mean actual studies or clinical data have been validated.
