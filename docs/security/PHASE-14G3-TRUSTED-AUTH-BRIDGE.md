# Phase 14G3 — Trusted Auth → private review gateway (staging source only)

**Status:** Implemented source and Node 22 unit tests; deliberately **not deployed or activated**. `fq.neumact.org` continues to use the existing static Vue frontend with read-only Helios. No production SQL, database role, secret or clinical record was modified.

## Boundary

- `supabase/functions/_shared/reviewGateway.mjs`: denies by default; receives a short-lived Bearer JWT, queries the project's **Supabase Auth /auth/v1/user** over HTTPS to verify it, checks the verified UUID against the signed token's subject, session UUID and expected issuer, rejects anonymous/unconfirmed accounts, uses an explicit request origin, size and schema limits, refuses caller-provided actor/role claims, and redacts SQL/provider error details. A separate flag disallows release.
- `supabase/functions/_shared/privateReviewExecutor.mjs`: one transaction, `SET LOCAL ROLE nfq_review_executor`, authenticated session row check in `auth.sessions` (including `not_after` expiry), transaction-local verified subject binding, then a parameterized call to `review_stage.review_command`. A missing/revoked/expired session fails **before** any review action.
- `supabase/functions/nfq-review/index.ts`: candidate Edge Function binding to a **dedicated** database transport role, configured only through server secrets. No direct `SUPABASE_DB_URL` privileged/owner use. Requires `NFQ_REVIEW_GATEWAY_ENABLED=true`, dedicated `NFQ_REVIEW_DB_URL`, correct Supabase URL and Auth key; nothing is deployed by merging these files.
- The private DB function from #187/#188 additionally enforces active membership, specialty-review grant, proposer independence, evidence digest, optimistic lock, idempotency, immutable audit, and separate release authority. This gateway **does not** bypass those checks or publish the private SQL function as a REST RPC.
- GitHub Actions Node 22 contract checks hostile HTTP payloads, cross-origin access, invalid/expired auth, raw identity metadata, nonpersistent failures, active session requirement, parameter binding and transaction rollback. The existing Postgres contract continues to verify review serialization and negative SQL permissions.
- The mock transport and JWT signatures used in unit tests are synthetic **test data only**, not scientific records or a claim of actual remote authentication. No live Auth token or patient data is committed.

## Required separate production-release gates

1. Provision a non-owner `nfq_review_transport` database LOGIN with **SET ROLE** membership to `nfq_review_executor` and nothing broader; explicitly permit executor only narrow `auth.sessions` columns under a reviewed private grant. Validate that pooled connections cannot retain GUC/role state across requests.
2. Configure that dedicated connection string only in Edge Function server secrets, NOT the repository, static bundle or a client-visible setting. Do not substitute postgres, service_role, or Supabase owner's URL.
3. Deploy to an **isolated Supabase staging project**, exercise real signed Auth JWTs and verified active/revoked sessions, test CORS and malformed request behavior, and run the complete SQL authorization and concurrency contract.
4. Confirm production DB review schema/role bootstrap, authenticated research membership provisioning, reviewed RLS, trusted evidence verification and staged rollback. Existing 14G0 lockdown remains in force.
5. Require independent scientific governance and privacy approval before authorizing **submit or approve** operations; a further independent release approval is required to enable release.
6. Only after these validations may the Vue/Helios UI connect to a verified URL. The public review catalogue must be server-filtered and redacted; no synthetic queue entries.

Supabase guidance: https://supabase.com/docs/guides/functions/connect-to-postgres and https://supabase.com/docs/guides/api/securing-your-api . This is a deployable *candidate*, not a claim of completed clinical review activation.
