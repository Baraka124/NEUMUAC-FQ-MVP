# Phase 14H110 — initial administrator verification and one-time bootstrap

The live CFTR project has a research-membership table, role-management RPC, and private membership audit table. **The first administrator cannot be assigned by the normal role-management RPC**: it correctly requires an already-active administrator.

The user must identify the exact account by signing in to the existing Research Administration workspace and reading the full **Research account ID** disclosure. This UUID is an identifier, **not proof of ownership or permission**. Verify the intended account through an independent channel with the authorised project owner, check the same account in Supabase Auth, and obtain an approved change ticket before considering privileged bootstrap.

## Completed 2026-11-06
A production **read-only transaction** ran three negative checks using a synthetic *unassigned* JWT subject with the `authenticated` database role: `nfq_submit_source_correction`, `nfq_review_source_correction`, and `nfq_admin_set_member_role` all raised insufficient privilege. The transaction rolled back; it did not insert or update scientific data or memberships. This simulates a database role/claim only; it is **not a real client JWT integration test**.

## Guarded procedure
`staging/security/140_first_administrator_manual.sql` is a **manual maintenance tool, never a migration**. It must not run until ownership and an approved change ticket are verified.

Its transaction blocks execution for missing input, non-privileged DB operators, unknown target UUID, existing role assignments, or existing audit events. It writes a single active administrator membership and one private audit event with null `actor_id` to indicate an external privileged bootstrap. The approved ticket and operator identity must also be preserved in the external change-control record; the existing database audit schema does not store a ticket or human operator identity for this bootstrap.

Never use a user-supplied email address, browser role label, count of Auth users, or a publicly editable claim as standalone authorisation. Never run this through the Vue frontend, an anonymous endpoint or a migration with a hard-coded UUID.

## Acceptance before enabling the UI switches
1. Verify the full account UUID, owner control, relevant Auth identity and change-ticket approval.
2. Execute the script only if authorised; check exactly one active admin role and the corresponding private audit record. Check that no other accounts were changed.
3. From a fresh real signed-in JWT, confirm that the account reads only its own membership and that the administrator role appears in the UI.
4. Use separate test identities for contributor/reviewer flows. Confirm unassigned and revoked JWTs fail, proposer cannot review their own work, and reviewers cannot write directly to evidence/variants.
5. Verify submission, review, replay denial, audit ordering and revocation. Acceptance must not update public evidence.
6. Activate `VITE_NFQ_SOURCE_CORRECTIONS_ENABLED`, `VITE_NFQ_SOURCE_REVIEW_QUEUE_ENABLED` and `VITE_NFQ_SOURCE_REVIEW_DECISIONS_ENABLED` separately, only after these checks and a verified frontend release.

The normal role-management RPC remains database guarded. Public variant catalogue, therapeutic response classifications (including exceptions), evidence and Helios paths are not part of bootstrap.
