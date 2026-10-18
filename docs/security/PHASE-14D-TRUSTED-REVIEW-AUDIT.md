# 14D — Actual database review-access audit and release gates

**Status:** READ-ONLY INSPECTION; no database, RLS, grant, Auth, Edge Function, RPC, or schema mutation deployed.  
**Inspected:** 2026-10-19, connected Supabase project named **Cystic Fibrosis** (the neumuacFQ project's candidate database, subject to deployment-environment confirmation).  
**Evidence:** Supabase list_tables, Security Advisors, read-only PostgreSQL catalog checks (`pg_policies`, `pg_proc`, `has_table_privilege`). No user or patient rows were queried.

## Findings — these block reviewer activation

1. `public.variants` has `anon`/`authenticated` policies allowing `INSERT` and `UPDATE` using always-true predicates, and effective corresponding grants. It is **not** safe to rely on browser PINs or client display roles to protect scientific classification fields.
2. `public.contradictions` allows `anon` INSERT/UPDATE with permissive predicates; `public.validation_history` permits anonymous INSERT; `public.helios_pending_review` permits anonymous SELECT/INSERT/UPDATE and `public.helios_audit_log` permits anonymous SELECT/INSERT. Corresponding table grants were confirmed. `public.audit_log` permits anonymous SELECT/INSERT.
3. Security Advisors warn that `public.check_write_pin(p_pin text)` and `public.set_write_pin(p_pin text)` are `SECURITY DEFINER` functions executable by both anonymous and authenticated database roles. `helios_claim` and `helios_release` are also executable by anonymous users (not definer functions; authorization body semantics have **not** been inspected). **Do not** treat legacy PINs or claims as trusted reviewer authorization.
4. Other warnings: `pg_trgm` and `fuzzystrmatch` reside in the public schema; leaked-password protection is disabled; `search_history_log` has RLS but no policies. Independently prioritize these with the database owner.
5. The current legacy review schema records names, claimed-by text, notes and history in the browser-exposed schema; no reviewed `research_review` transaction boundary, nonforgeable reviewer roles, append-only guarantees or independent release authorization was verified.

**Risk statement:** The combination of effective grants and permissive RLS policies exposes actual anonymous write paths. Changes to the client alone cannot prevent direct API requests. **Do not enable 14E submissions, 14F resolution writes or Helios claim/approve buttons.** Existing public legacy deployment exposures should be assessed urgently by the database owner.

## Safely staged remediation — NOT executed

- Confirm the active deployed project ID and collect rollback-safe grants/policy/function inventories and current consumers; retain approved public read views only where genuinely intended.
- Coordinate a reviewed, reversible authorization migration with the database owner: remove unnecessary anonymous write grants/policies; revoke excess RPC EXECUTE; move privileged operations out of the exposed schema; enforce authenticated **server-derived** principal/role checks; check grants and RLS together. Require policy-specific ownership with `USING` and `WITH CHECK` where appropriate.
- Introduce a non-public trusted transaction boundary for review command and append-only event, including immutable scientific source snapshot, revision and digest, reviewer independence, optimistic locking, idempotent retries and a separate release authorization. Never trust client-submitted name, role or approval timestamps.
- **Acceptance:** test anonymous token access (negative reads/writes/exec), cross-account denial, proposer self-review denial, simultaneous updates, lost-response retry, revision mismatch, partial-transaction rollback, immutable audit and explicit emergency disable. Repeat after any RLS change.
- Keep browser read-only workflow and archived `index.1.html` untouched until production authorization review and rollback are signed off.
- Supabase linter references: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/api/securing-your-api.

## Code scope

`apps/clinical-web/src/domain/reviewBackendReadiness.ts` formalizes 13 independently checkable acceptance claims and unit tests. **It is a planning check, not an access-control implementation**, cannot substitute for RLS, and does not create endpoints or activate Helios writes. The trusted review write connection stays `not-connected`.

For neumDESK: innovation-project governance remains in neumDESK; neumuacFQ will have its own narrowly scoped authorized CFTR scientific review identity and audit only when implemented, never by inheriting neumDESK login assumptions.
