# Phase 14H173 — Independent Study Identity Adjudication & Evidence Readiness

## Purpose

Scientific publications, experimental reports and trial registrations are not
synonymous with independent studies. This release adds a **real, evidence-linked,
independently reviewed adjudication ledger** for uncertain pairs of currently
approved CFTR study observations. The ledger changes **neither** the original
observations nor the recorded five-therapy classification logic.

Production has **zero approved source claims** at implementation time: the
correct first state is an empty adjudication register, not prefilled examples.

## Workflow

1. An authenticated research member opens **Evidence & provenance → Research
   dataset → Inspect approved dataset → Study identity adjudication**. The
   dataset loads its complete, independently reviewed source inventory and the
   separate adjudication register. Both are session/member-gated and never
   fetched while the dataset is closed.
2. Potential overlap candidate pairs are derived from the **whole current
   approved dataset**, joining publications transitively via existing
   normalized study-family labels or reviewed registry accessions. No user
   account or browser form can declare a candidate independently of real
   reviewed source observations.
3. A contributor, reviewer or administrator may propose **same study**,
   **distinct studies** or **insufficient evidence**, with a source-linked
   30–900 character rationale and exact 8–240 character locator. Proposals
   are pending, not accepted evidence.
4. Two **different** reviewers/administrators, neither being the original
   proposer, independently approve the exact immutable revision. Any reviewer
   rejection rejects the revision. No submitter self-approval, duplicate
   review by one person or silent reinterpretation is allowed.
5. Corrections require a **new revision** with optimistic concurrency. A
   pending revision cannot be overwritten. A prior approved revision remains
   recorded until a replacement is independently accepted.
6. The reviewer UI displays source titles/reference IDs, exact published
   context and the proposed disposition; it does not expose reviewer emails
   or other private identity metadata. The server owns the independent-review
   and role checks.

## Private PostgreSQL ledger

Migration: `docs/sql/14H173_study_adjudication_ledger.sql`.

Private, RLS-enabled tables:
`nfq_evidence_review.study_adjudications` and
`nfq_evidence_review.study_adjudication_reviews`.

Direct grants are removed from anonymous and client-facing roles. All writes
are exclusively through `public.nfq_study_adjudications(...)` with
`SECURITY DEFINER SET search_path=''`, active JWT session verification,
current research membership and independently verified reviewer roles.

The RPC supports `list`, `propose` and `review`; list returns only the
latest adjudication revision of a pair whose **two original claims remain
currently approved**. This prevents superseded evidence from supplying a
false readiness signal. Bound limits and fail-closed validation prevent
partial inventories, stale versions and unauthorized writes.

Accepted dispositions deliberately remain *annotations*. A decision that
two publications represent **distinct studies** cannot automatically split
their pre-existing conservative study-family assignment. The source labels
must be reconciled through their original independently reviewed claim
revision path before separate evidence can be counted.

## Research readiness gate

The pure client assessor builds a conservative candidate forest per linked
study family. Every relationship potentially connecting multiple source
reports needs an accepted **same-study** decision to count as adjudicated.
An accepted **distinct-studies** or **insufficient-evidence** disposition
remains an unresolved study-identity issue until the original dataset's
study-family identity has been independently reconciled.

The existing analysis protocol is now **fail-closed** for internal split
planning when the adjudication inventory is unavailable, when any relevant
study-link candidate is unresolved, or when the source has conflicting
registrations. Its operational study-family counts remain provisional.
The result may still be descriptive-only; it is never a model validation
statement. Exported analysis manifests explicitly record adjudication
availability, counts and the exact latest pair IDs/revisions/statuses, so
they are not falsely identified only by the source dataset's SHA-256.

Candidates are capped at 250 per complete source snapshot (and read-only
visible rows at 40); an incomplete set triggers the truncated state and
does not permit split planning. Real data are never silently reduced to a
smaller “complete” set.

## Scientific boundaries

- **No automatically inferred patient/sample independence.**
- **No edits to five therapy response classifications or existing source
  measurements.**
- **No effect-size calculation, pooled statistics, accuracy claims or
  treatment-response prediction.**
- The ledger records source-pair provenance and adjudication decisions, **not
  patient-level, genotype-level or personally identifying clinical data**.
- Source claims retain their existing two scientific reviews; adjudication
  decisions require two *additional independent reviews*.

## Acceptance

Check TypeScript, source-domain unit tests, source-pair API
contract tests, connected E2E member/anonymous/empty-state tests, five-therapy
parity and all legacy integrity CI workflows. Apply the migration to the
**CFTR** Supabase project `oxlkisjwfarseyqgeyuw` only after those are green.
Post-migration, verify missing/invalid study pairs cannot be submitted without
current approved claims, and anonymous function access remains revoked.
Merge the exact green head commit and confirm Railway deployed the exact SHA.

## Next scientific work

Two real source publications with traceable study identifiers and clinical
researcher review assignments are needed to exercise the complete accepted
decision sequence on real evidence. Until independently reviewed source
claims exist, no relationship or response effect may be fabricated.
