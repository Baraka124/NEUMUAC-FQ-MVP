# Phase 4F-11K — Legacy writes and permissions dependency map

**Security priority. Read-only investigation, 2026-10-18. No live mutations.**

## Confirmed in Cystic Fibrosis Supabase (connected project `oxlkisjwfarseyqgeyuw`)

All four inspected tables (`variants`, `helios_pending_review`, `helios_audit_log`, `validation_history`) grant `anon` and `authenticated` SELECT/INSERT/UPDATE/DELETE, plus broader table-level privileges reported by `information_schema.role_table_grants` (TRUNCATE/REFERENCES/TRIGGER). These grants are distinct from effective row-level permissions. Existing RLS policies permit anonymous INSERT to all four, and anonymous UPDATE on variants and Helios pending reviews using unrestricted row predicates. No anonymous UPDATE RLS policy was observed for Helios audit or validation history. **Treat this as an actionable security blocker, not proof that every table operation succeeds under the Data API.**

## Existing legacy application dependencies

Direct inspection of frozen `index.1.html` (blob `c18221fb6baf47782318ca3685b94b088c359a66`) demonstrates REST/JSON access including:
- `helios_pending_review` endpoints around lines 9645, 29212, 30753, 30811, 30845, 31681, 31961; inspect request methods and caller identity before revoking access.
- `helios_audit_log` endpoints around lines 10709, 31321, 32095, 33411; original code contains comments about an action CHECK constraint near 10685.
- `validation_history` endpoints around lines 20880, 33329 and read paths around 8389 and 14321.

**Do not infer that all these calls are unauthenticated or used in the deployed modern app.** Dependency inventory must include method, token source, deployment reachability, UI permissions and current usage before any grant change.

## Controlled remediation sequence

1. Confirm production/staging connection and Data API exposure with owners.
2. Inventory actual POST/PATCH/DELETE paths, session/token handling and scheduled integrations. Inventory Postgres table constraints, triggers, all grants (including PUBLIC and inherited roles), RLS and function execution.
3. Define public read-only access to a minimal published scientific catalog; sensitive Helios reviews and audit details should not be publicly exposed without separate review.
4. Implement authenticated, least-privilege writes with server-verified roles, immutable audit, separation of submitter/reviewer and atomic review transitions. No assumptions based on `TO authenticated` alone.
5. Prepare and test controlled rollback/forward migration on an isolated copy; explicitly verify denial for `anon` and unauthorized signed-in users and continued authorized workflows. Review backup and incident response.
6. Release security change in an approved maintenance window. Only then enable synonym proposal persistence.

**Risk:** Current documented exposure warrants owner/security review without waiting for cosmetic UI phases. **No SQL changes executed**. PR #133 architecture review and PR #134 initial audit should be reconciled rather than overwritten.
