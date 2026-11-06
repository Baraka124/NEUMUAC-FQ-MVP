# Phase 14H111 — revoked-member proposal visibility: deployment record

Deployment confirmed on 2026-11-06 in the existing CFTR Supabase project.

- Supabase migration **20261106092133_neumuacfq_phase_14h111_revoke_aware_proposal_reads**
- Source: `supabase/proposed/14h111_active_membership_proposal_read.sql` (GitHub blob SHA `454637f311742d9cb0d49f4bf93c200388b1d410`)
- Implementation: [PR #285](https://github.com/Baraka124/NEUMUAC-FQ-MVP/pull/285), six CI suites passed including the new disposable PostgreSQL revocation contract
- Tracked finding: [Issue #284](https://github.com/Baraka124/NEUMUAC-FQ-MVP/issues/284)

## Verified immediately after deployment

`nfq_source_proposal_read_own_or_reviewer` has been replaced. **All** private proposal SELECT paths require an active `nfq_research_memberships` row (`revoked_at IS NULL`), including the original author path. Active contributors can see only their own proposals; active reviewers and administrators can see proposals needed for review.

Live schema inspection confirmed the policy definition, that RLS remains enabled, that membership/proposal/event tables still contain **zero rows**, and that the migration version was entered in Supabase history.

The automated tests validate revoked creator denial, unassigned-account denial, active reviewer visibility, private audit isolation and the no-publication boundary. Those tests used disposable PostgreSQL rather than real production signed-in JWTs.

## Remaining production activation gates

- Identify and independently verify the intended administrator account; do not auto-promote from the existence of a Supabase Auth user.
- Conduct actual authenticated JWT/API acceptance testing of creator/reviewer visibility, revoked membership, RPC denial, replay prevention, and role reassignment.
- Keep `VITE_NFQ_SOURCE_CORRECTIONS_ENABLED`, `VITE_NFQ_SOURCE_REVIEW_QUEUE_ENABLED` and `VITE_NFQ_SOURCE_REVIEW_DECISIONS_ENABLED` off until sign-off.
- Do not amend variants, evidence links, responder/non-responder classifications, ETI/other therapy rules or Helios as part of this access-control rollout.
