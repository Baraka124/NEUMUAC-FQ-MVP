# ADR-0004 — Trusted scientific review and controlled release backend

**Status:** Isolated PostgreSQL transaction prototype verified; production connection not authorized · **Original ADR date:** 2026-10-14 · **Staging verification:** 2026-10-19  
**Environment:** Offline workflow model only; no production Supabase policies, schema, edge function, UI, or Django deployment changed.


## 2026-10-19 staging implementation and acceptance evidence

PRs [#187](https://github.com/Baraka124/NEUMUAC-FQ-MVP/pull/187) and [#188](https://github.com/Baraka124/NEUMUAC-FQ-MVP/pull/188) are merged. Both executed on disposable PostgreSQL 17 through `.github/workflows/review-postgres-contract.yml`.

- `staging/review/001_review_schema_and_rpc.sql` now defines `review_stage.review_command` in a non-exposed database schema, executable only by the dedicated `nfq_review_executor` role. The former public authenticated review RPC is not created in this staging design.
- The command requires both a **current, non-revoked research membership** (`public.nfq_research_memberships`) and a separately authorized specialty grant. Reviewer and proposer independence, evidence digest, exact revision, row-version optimistic lock, atomic event insertion and idempotency-key matching are enforced within the transaction.
- Fixture tests in `002_disposable_ci_contract.sql` deny direct anonymous/authenticated invocation; prohibit a revoked research member even with a surviving specialty grant; test duplicate keys, replays, stale version and forced event failure rollback; and verify the append-only review, idempotency and audit triggers.
- `003_concurrent_review_contract.sh` starts **two separate database sessions**. One reviewer holds a row lock while the second, with a different valid specialty, attempts the same expected version. The second is observed blocked and then rejected; one review, one corresponding event, and a consistent version and idempotency count remain.
- These tests use **simulated transaction-local identities** in a disposable database. They do **not** prove external JWT signature validation, protected connection-pool setup, production concurrency, production auditing, or live Supabase policy behavior.
- **Future trusted service MUST verify the user token**, establish the authenticated subject in a private transaction, hold the executor credential exclusively on the server, enforce membership grant/revocation freshness and expose only narrowly scoped authorized request handlers. Never accept a subject/role asserted by a browser request body.
- Shared authentication with neumDESK is a future verified identity integration boundary. Do not assume that a neumDESK client role or token already authorizes neumuacFQ scientific review.
- **Do not deploy this staging SQL against the production Supabase project or turn on Helios writes.** Database grants locked down in 14G0–14G1 remain in force and need separate release assessment.

This supersedes the original *proposed-only* implementation status below **only for isolated staging**. The full regulated scientific review feature remains unavailable in production.

## Decision

Keep Supabase PostgreSQL as the intended transactional system initially; use a **trusted server execution boundary** (audited PostgreSQL SECURITY DEFINER RPC with minimal rights, or authenticated Edge Function invoking restricted SQL) for review actions. Postpone Django pending evidence of complex Python service needs. Never let a browser submit its own reviewer identity, roles, evidence verification, approval timestamps, or release authorization.

Phase 2H creates `apps/clinical-web/src/domain/trustedReviewModel.ts`, a pure specification and adversarial unit tests. This is **not** a deployed authentication or security service. A client can forge any JavaScript model input; only database/server enforcement makes authorization real.

## Required flow

Draft → Under review → Ready for release → Released. A reject action creates Rejected, which requires a new revision, rather than hidden edits. Alias proposals require independent scientific + engineering approvals; search-disposition policy requires privacy + engineering approvals; a separate release manager and institution-level release authorization are required for activation.

Each transition must check authoritative actor, role grants, proposer/reviewer separation, revision, concurrency version, evidence revision hash, decision-specific approval rules, idempotency key and release state **inside one transaction**. Record the event and state change atomically, with an immutable audit event including actor, timestamp, record version and outcome.

## Proposed PostgreSQL objects, not executed

`research_review.decisions`: primary ID, current revision, phase, row version, proposer principal UUID, decision payload/target, evidence reference digest, timestamps.  
`research_review.revisions`: immutable revision records, canonical payload digest and supersession lineage.  
`research_review.approvals`: decision ID/revision, trusted reviewer UUID, exact role and verdict, reference/evidence digest, signed-off timestamp. Unique actor per revision and role per revision as appropriate.  
`research_review.events`: append-only audit event ID, state transition, authenticated actor UUID, transaction time, role, reason, prior/new version, request ID, protected integrity metadata.  
`research_review.idempotency`: unique (actor UUID, command-key) and request fingerprint and result, written transactionally.  
`research_review.release_authorizations`: separate change-control authority, target ruleset hash, named operator, approved window, release/rollback record.

Expose **only** minimally privileged RPCs or API handlers for submit, attest, reject and release. Revoke direct table writes from anon/authenticated roles; use restricted server authorization and explicit grants to dedicated non-owner roles. Enforce RLS/tenant access for all exposed read paths, and protect sensitive audit fields with separate read privileges. Avoid mutable `user_metadata` as a role source.

The SQL needs a documented threat model, approved schema namespace, conflict/replay tests, immutable append-only controls and staging verification before anyone can responsibly apply it. Do not paste execution-ready production DDL into a deployed migration without a separate review.

## Django decision checkpoint

Compare Supabase SQL RPC + Edge Functions with Django REST Framework + workers after a genuine review API prototype exists. Django becomes reasonable if we need long-running evidence federation, organization-wide service integration, high-volume research pipelines, extensive operational service-layer testing or multiple client applications; it should not bypass Supabase RLS or become a second, inconsistent authority source.

## Required adversarial staging tests

- Anonymous and unauthorized writes denied; authenticated reviewer roles independently verified.
- Proposer cannot attest to own proposal; same reviewer cannot satisfy both required roles.
- Late/stale version write denied; simultaneous approvers cannot both update the same prior version.
- Network retry with the same idempotency key cannot duplicate an approval, and different body with reused key is rejected.
- Any failure after state transition but before event writing rolls back both operations.
- Rejection requires a new revision; cannot be overwritten silently.
- Release requires an independent manager, signed change-control authorization, exact ruleset hash, valid evidence and current revision.
- Database audit log cannot be edited/deleted by the app, including privileged HTTP endpoints.

## Operational restrictions

No clinical approval, authentication verification, tamper-proof audit or released nomenclature mappings have been achieved by this phase. The production root HTML, CNAME, Supabase database, Vercel routing and new Vue UI remain unchanged.
