# Phase 14H166 — independently reviewed source claims

This version connects a **real, empty-by-default source claim workflow** to the
existing CFTR multi-therapy engine and contradiction reconciliation. It does not
edit historical `variants`/therapy response labels, published original research
rules, or patient-level records.

## Exact workflow

1. A verified contributor, reviewer or administrator opens a variant dossier
   and proposes an observation from a **previously linked source**.
   Required: exact therapy, recorded reference ID, scope, method, finding,
   study family, specific source locator and research rationale.
2. A different verified scientific reviewer/administrator independently
   checks the original document and submits a recorded reasoned decision.
3. A **second, distinct** reviewer must approve. The claim becomes
   `approved` only after both attestations, and then feeds the five-therapy
   and evidence-conflict methods. Contributors cannot review; nobody may
   approve their own claim. Rejection finalizes the record without promoting it.
4. New corrections are submitted as **new revisions**; prior versions and
   audit events remain. The previously approved claim remains active until the
   new revision gains both approvals; its predecessor then becomes `superseded`.
   There is never more than one active approved revision per series.

## Security

- SQL: `docs/sql/14H166_double_independent_source_review.sql`.
- Claims, decisions and event history reside in a **non-exposed private
  schema** `nfq_evidence_review`, RLS enabled, direct grants removed.
- Only the allowlisted `public.nfq_reviewed_source_claims` RPC is callable by
  `authenticated`. On each request it independently checks a current session
  in `auth.sessions`, an unrevoked `nfq_research_memberships` assignment,
  and (for decision) its actual role; it derives `auth.uid()` server-side.
- All changes use an atomic Postgres transaction, with row locking and
  a uniqueness constraint on active approved revisions. Reviewer identities,
  patient fields, credentials, free-text raw source metadata and sessions are
  never returned in the response. Reviewer **attestation identifiers** are
  provided only for verifying independent approvals in the research engine.
- The selected reference must belong to the exact variant. Source claims
  are not fabricated from existing bibliographic links or source scores.
- Requests have finite bounded inventories, no role parameters, no
  `service_role` credentials and no anonymous RPC permission.
- Result versioning and claim identities are validated a second time by the
  typed frontend reader. Invalid or incomplete responses fail closed rather
  than converting to zero approved claims.

## Research methods

The original deterministic evidence-conflict reconciler accepts only approved
source claims with two independent review attestations. Study family IDs are
used to avoid treating repeats as independent replications. Differences by
experimental method or biological scope are flagged separately from direct
same-scope disagreement. The original five-regimen calculator is untouched.

All five therapies remain research-only, **not treatment recommendations**.
Approval means independently reviewed source metadata, not clinical trial
validation or an established individual response probability.

## Verification

- Unit contracts for wrong variants, missing reviewers, duplicate revisions,
  unapproved versions, missing reference provenance and malformed payload.
- Desktop/mobile browser contracts for restricted access, empty source
  inventory, approved source entering the research conflict engine and the
  structured source submission form.
- Clinical TypeScript, build, existing five-therapy and original calculator
  regression checks must pass before production release.
- Database migration tested only against the **correct CFTR Supabase project**,
  never the neumDESK/RADAR projects.
- No real new source claim was automatically inserted during rollout.

## Remaining research work

Actual source extraction, trained and externally validated quantitative
prediction, patient genotype/phase integration, clinical applicability and
patent examination remain separate tasks. Never present the reviewed-source
metadata feature as a clinically validated drug-response predictor.
