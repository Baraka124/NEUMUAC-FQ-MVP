# Phase 2I — Transactional PostgreSQL Review Prototype

**Status:** Experimental, staging-only SQL. **Not applied to Supabase production.**  
**Date:** 2026-10-14

## What is actually implemented

- `staging/review/001_review_schema_and_rpc.sql`: self-contained prototype schema with decisions, independent reviewer grants, verified-evidence digests, approvals, release authorizations, append-only events, request idempotency and one locked, transactional `nfq_stage_review_command` function.
- `staging/review/002_disposable_ci_contract.sql`: fixture-driven PostgreSQL tests for legitimate staged progression, rejection of direct writes, idempotent replay, and atomic rollback under deliberate audit insertion failure.
- `.github/workflows/review-postgres-contract.yml`: disposable PostgreSQL 17 service runs the SQL with no Supabase tokens, production URLs or credentials.

This SQL is deliberately outside `supabase/migrations` and should **never be run against a production Supabase project**. All fixture identities and decision IDs are synthetic.

## Trust model and explicit limitations

The SQL derives actor ID from `auth.uid()`. In disposable CI this function is stubbed from a test GUC; that validates SQL mechanics, **not signed JWT validation**. In a real Supabase environment, JWT identity, authenticated database role, grants, target schema API exposure and session handling must be independently verified.

The RPC is `SECURITY DEFINER`: RLS does **not** protect against a privileged function's bad logic. Read the entire function and verify tightly scoped ownership and PostgreSQL privileges, with a dedicated non-login owner role in a reviewed real deployment. The prototype's actor grants, evidence checks and release authorizations are inserted only by CI's privileged fixture setup. Their future ingestion/writes must have independently audited, trusted administrative pathways. **The prototype does not implement those pathways.**

The test intentionally uses a separate review-stage schema and an `nfq_stage_review_command` function for exploration only, **not a production API**. Row-version lock and idempotency are transaction-bound. A trigger blocks update/delete of audit events, including casual owner DML, but a database owner/superuser can still disable triggers; tamper evidence needs restricted operations, external logging or cryptographic attestation.

The prototype has not proven true parallel transaction behavior, malicious JWT rejection, real RLS policies for read surfaces, source authenticity, security definer search-path ownership in Supabase, release governance or clinical validity. Those remain required staging/owner review gates.

## Next concrete checks

1. Expand test coverage with **separate connections** for stale writer interleaving, key collisions, false roles, role revocation, proposer/reviewer conflict, and same-actor double approval.
2. Verify production **schema and RLS read-only** with authorized database owner; no modifications.
3. Set up isolated Supabase staging; no patient data; review SQL implementation with a PostgreSQL/Supabase specialist before any execution.
4. Test authenticated Edge Function / PostgREST runtime permission and signer behavior; avoid privileged keys in browsers.
5. Decide whether Supabase RPC + Edge Functions meet nonclinical approval flow requirements, then reassess Django based on measured operational needs.

No live application or backend release occurs in Phase 2I.
