# Phase 2K-S — Staged production security remediation (PROPOSAL ONLY)

Live Supabase project inspected read-only on 2026-10-14. **Do not run these scripts on production without separate explicit approval.** No credentials or sensitive row content were retrieved.

## Verified risks
- RLS enabled does not imply safety: `public.variants` has permissive anon INSERT/UPDATE, `api_keys` has unrestricted anon SELECT, multiple Helios and log tables permit anonymous operations.
- Both `write_pin` and `write_pin_hash` config keys exist (values not accessed). `check_write_pin(text)` and `set_write_pin(text)` are anon-executable SECURITY DEFINER functions.
- Important legitimate legacy functionality relies on anonymous writes. Abrupt deployment of these scripts would disrupt it.

## Controlled sequence
- **Stage A**, after owner sign-off: isolate credential-bearing tables, logs, Helios review and clinician notes; revoke PIN RPC execution. Expect affected legacy views and features to stop working. Inventory affected UI journeys first.
- **Stage B**, only after replacement authenticated write flows have been built and tested: revoke anonymous mutations to variants/evidence and related workflows. Do not grant broad authenticated table writes; implement narrowly scoped authenticated RPCs with authoritative roles.
- **Release**: take backups, rehearse rollback, test real authorized/unauthorized sessions and verify the user-facing workflow. A disposable PostgreSQL CI test does not establish Supabase Auth JWT security.

## Required manual work
- Inventory exact legitimate writes and clinical roles by table and endpoint before production migration.
- Review API key rotation and exposure, without reading key values into chat or repo.
- Review leaked-password protection and SECURITY DEFINER risks; rotate potentially affected credentials using the provider's managed workflow.
- Validate table grants, RLS, service-role bypass and RPC execution after each rollout.
- Create migration-safe rollback scripts based on the pre-change policy/grant inventory, never blindly restore unsafe access.

## Sensitive data caution
The search log schema contains IP, institution, clinician names and location data. Keep these fields out of CI fixtures and GitHub artifacts. Only synthetic test cases may appear in the security regression suite.
