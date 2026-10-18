# Phase 4F-11J — Helios integration access-control audit (read-only)

**Status: SECURITY BLOCKER — DO NOT ENABLE ANY NEW CURATION WRITES.**
Inspected connected Supabase **Cystic Fibrosis** project `oxlkisjwfarseyqgeyuw` on 2026-10-18 using read-only metadata SQL (`pg_policies`, `has_table_privilege`). No DDL, DML, permission changes, or production data edits were executed.

## Verified facts

- `public.variants`: `anon` has effective SELECT/INSERT/UPDATE grants; RLS policies `variants_read`, `variants_write`, `variants_update` allow `anon`; UPDATE uses `USING true` and `WITH CHECK true`.
- `public.helios_pending_review`: `anon` has effective SELECT/INSERT/UPDATE grants, with permissive `anon_insert_helios_pending` (`WITH CHECK true`) and `anon_update_helios_pending` (`USING true`).
- `public.helios_audit_log`: `anon` has effective SELECT/INSERT/UPDATE table grants, with an `anon_insert_helios_audit` policy (`WITH CHECK true`). No anon UPDATE RLS policy was observed in this audit: UPDATE grant alone does not establish that UPDATE is permitted.
- `public.validation_history`: `anon` has effective SELECT/INSERT/UPDATE grants and `anon_insert_validation_history` (`WITH CHECK true`). No anon UPDATE RLS policy was observed.

**Impact:** Existing grants plus permissive policies appear to allow unauthenticated inserts and changes to scientific variants and Helios review records through authorized Data API paths, assuming API exposure is enabled. This must be treated as a priority security risk pending direct authenticated/anonymous **non-mutating** configuration confirmation. Do not attempt write probes on production.

## Safe change plan (not executed)

1. Identify the exact deployed environment and source of legitimate writes: original frozen app, current Vue, server tasks, external integrations; determine whether legacy anonymous writes are still depended upon.
2. Inventory grants, RLS, trigger/function privileges, exposed schema, views, API settings, JWT claims, dependencies and reviewer roles.
3. Prepare an owner-approved, reviewed migration that revokes `anon` INSERT/UPDATE/DELETE for scientific and audit records and replaces permissive write policies with authenticated actor ownership/reviewer authorization. Do not assume `TO authenticated` alone is sufficient.
4. Separate public read catalog from sensitive curation/audit fields. Enforce audit append-only and server-side actor attribution. Validate denied access through isolated non-production integration tests.
5. Deploy in a controlled maintenance window with backup, regression and rollback strategy. Confirm clinical/editor workflows still operate before and after hardening.
6. Only then design specific alias proposal persistence reusing Helios tables when constraints and policy shape permit.

**Design status:** Earlier Phase 11G/11H client-only contracts do not protect server data. Phase 11I architectural review remains useful but incomplete until this access issue is resolved. No scientific synonym promotion or Helios write support should proceed.
