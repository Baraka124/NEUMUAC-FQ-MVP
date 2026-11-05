# Phase 14H109 — source correction review foundation deployment

Deployment date: 2026-11-05. Supabase project: Cystic Fibrosis (`oxlkisjwfarseyqgeyuw`).

## Applied database migration
- Production migration name: `neumuacfq_phase_14h109_source_correction_private_review_foundation`
- Version: confirm via Supabase migration history; do not assume it matches the original proposed file timestamp.
- Repository SQL: `supabase/proposed/14h105_source_correction_review.sql` at blob SHA `144479bd763bfefd48caec9012c01c1c91946a35`.
- This exact tested SQL was applied using the connected Supabase migration API. Do **not** apply it again; use migration history and the live schema when reconciling deployments.

The migration creates two isolated tables (`public.nfq_source_correction_proposals`, `public.nfq_source_correction_events`), enables RLS, and installs `nfq_submit_source_correction` and `nfq_review_source_correction`. Accepted proposals only record a scientific review outcome. They do NOT update `variants`, `evidence_links`, therapy claims or Helios.

## Verified production state immediately after deployment
- Both new tables exist and have **zero rows**.
- `nfq_research_memberships` has **zero role assignments**; no account was automatically bootstrapped.
- RLS is enabled on both tables. The private events ledger has zero public policies.
- Anonymous table SELECT is denied. Authenticated proposal SELECT is granted but constrained by its RLS policy to the creator or an active reviewer/administrator.
- Direct authenticated INSERT and UPDATE on proposals are denied. Browser roles have no direct SELECT on the events ledger.
- Authenticated users have RPC EXECUTE privilege for both functions, but the function body checks active membership; review further requires reviewer/administrator and forbids self-review.
- All client feature switches remain disabled by default:
  `VITE_NFQ_SOURCE_CORRECTIONS_ENABLED=false`,
  `VITE_NFQ_SOURCE_REVIEW_QUEUE_ENABLED=false`,
  `VITE_NFQ_SOURCE_REVIEW_DECISIONS_ENABLED=false`.

## Security review and remaining gates
- Supabase Security Advisor flags authenticated SECURITY DEFINER execution on the two new protected RPCs. That reflects their intentional API exposure; it is not evidence of authorization bypass, but warrants real JWT/RLS denial testing before any switch is enabled. [Supabase advisory reference](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- The ledger's RLS-with-no-policy finding is intentional, private by design. [Supabase advisory reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Other existing warnings are tracked independently; leaked-password protection is disabled in the project [see guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
- Confirm the actual owner account ID by independently verified ownership, not inferred from a single Auth user. Then bootstrap an administrator through an attributable privileged maintenance procedure; never implement public self-promotion.
- Run genuine active/revoked/no-role JWT tests for proposal submission, creator/reviewer RLS, independent review, replay prevention, and the audit ledger. Test no unintended scientific source updates.
- Introduce accepted/rejected proposals only into a separate controlled publication process with source equivalence, provenance and therapeutic interpretation review. No automatic publication in this migration.
- Inspect Vercel production configuration and deployment before enabling any switch; a frontend feature flag is not an authorization boundary.

## v4 regression baseline
Preserve original nuanced responder/non-responder labels, class-specific therapy exceptions including ETI and other modulator logic, read-only variant and evidence browsing, Helios read paths, contextual return navigation, and disabled geographic recording. UI must retain the compact institutional visual language.
