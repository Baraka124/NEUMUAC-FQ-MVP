# neumuacFQ · 14H210–211 — Scientific consistency and real-review handoff

## 14H210 — Source-level adjudication consistency

The pure expert adjudication engine and the proposed SQL now agree that source-locator disagreement requires independent adjudication, not an inferred match. Adjudication when two original reviews agree is rejected.

The comparative evidence engine accepts an independently reconciled source locator only when it exactly matches the adjudicator's recorded locator. Differences in genotype scope, experimental model or endpoint still make evidence incompatible; an adjudicated qualitative finding cannot resolve different experiments by fiat.

Added `expertSourceReconciliation.test.ts` with boundary tests. No primary study response labels or treatment rules are changed.

## 14H211 — Operational independent-review preparation

Added `expertReferenceOperationsManifest.ts` and tests. It takes versioned, publication-anchored, **blinded** packets prepared in 14H207 and creates exactly two independent reviewer work orders for each publication/variant pair. Each work order includes PMID, DOI, primary source URL, review question and structured extraction requirements. Reviewers are **not assigned by the software**, and outcomes are not prefilled.

Manifest invariants:
- `independentReviewsCompleted=0`, `adjudicationsCompleted=0`, `mappingAttestationsCompleted=0`
- `realWorldExpertValidation=false`, `canReleaseScientificAccuracy=false`, `deploymentReady=false`
- source packet blinding preserved, duplicate assignments rejected, no synthetic patient or trial-efficacy data

The manifest is not proof that human experts were invited, authenticated or completed review. Those require authorized real people and verified server records.

## Exact current infrastructure status

Read-only Supabase discovery finds the active `Cystic Fibrosis` project but no CFTR development branch. Creating a new Supabase project or branch may add charges; no billable environment has been created without approval. The proposed expert registry SQL and staging tests therefore remain **unexecuted** against a real isolated staging instance. The production CFTR project has not been mutated.

## Next release gate

1. Provision or designate an isolated CFTR database with a reviewed cost plan and no production records.
2. Exercise the proposed SQL and 14H202/208 negative tests in staging. Check active-session authentication, RLS/grants, concurrent writes, immutable audit, duplicate reviewer denial, adjudicator identity separation and evidence mapping constraints.
3. Invite genuinely independent CFTR scientific reviewers to the real primary publications, verify catalogue variant IDs, record actual source observations, and adjudicate discrepancies.
4. Only after that evidence is captured should the platform generate independent scientific validation statistics; existing qualitative comparison flags do not establish empirical accuracy.

No UI changes, production table changes, therapy-eligibility changes, or invented scientific conclusions.
