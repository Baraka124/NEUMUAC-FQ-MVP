# Phase 2L — security and authorization release gates

**Status: NOT RELEASED. No production database change is authorized by this document.**

## Verified repository baseline
PR #20 merged after #19 and #18. Existing live root `index.html`, `CNAME`, runtime deployment, and production Supabase remain unchanged by Phase 2L. The scripts in `staging/security` are proposals, not deployed migrations.

## Gate 0 — staging/non-deployment (automated)
`python tools/security_release_gate.py` verifies expected scripts remain present, have transactional/revocation review markers and are absent from automatic `supabase/migrations`. It also flags selected deployment-looking commands in workflows. This is a *static guard only*, not a SQL parser, security audit, or proof of authorization.

## Gate 1 — inventory and dependency map (NOT MET)
- Enumerate tables, views, functions, schema grants, column grants, RLS, policies, ownership, definer privileges, and all browser/API entrypoints without retrieving credentials, PINs or patient data.
- Trace legacy variant browse/search, analytics, notes, audit, Helios, PIN, imports and evidence write journeys to their actual database calls.
- Identify owners, credential rotation/invalidation scope, authorized roles and the read-only public catalog fields.
- Resolve overlapping staged scripts `010/020` versus `01/02`; never execute both sets blindly.

## Gate 2 — real isolated Supabase Auth/RLS verification (NOT MET)
- Test anon, authenticated non-curator, curator, reviewer and revoked/expired session with genuine signed Supabase sessions in isolated staging.
- Explicitly check browser direct table access, view security-invoker/definer behavior, RPC EXECUTE, role grants, non-owner behavior, unauthorized writes, audit trails and role revocation.
- Use authorized deidentified or disposable staging data only; no synthetic rows in the user-facing Vue application.
- Record results, failures and reviewer decisions. Local `auth.uid()` mocks are insufficient.

## Gate 3 — compatibility, backup and recovery (NOT MET)
- Validate replacements for legacy PIN, Helios, analytics, review, import, search and evidence workflows.
- Confirm approved backup and test a restore; document maintenance window, migration order and rollback.
- Independently review scientific behavior and data-access/privacy requirements.

## Gate 4 — explicit production approval (NOT MET)
Require named institutional/security/data owners' decisions, complete gates 1–3, an approved deployment runbook and **separate explicit authorization** before any live SQL, key rotation, RLS, privilege, auth or runtime change. Merge of this documentation is NOT production approval.

## Acceptance for this PR
- CI executes the static non-deployment guard.
- Existing integrity and disposable PostgreSQL checks remain intact.
- No edit to root `index.html`, `CNAME`, production connection configuration, or production database.
- No claim that actual Supabase JWT/RLS or production security has been validated.
