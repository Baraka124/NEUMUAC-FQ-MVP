# Phase 2M-C — authenticated catalog release boundary

Status: **STAGING CONTRACT ONLY / NOT DEPLOYED**.

## Read-only production findings (14 October 2026)
- Existing `public.variants` exists and has RLS, but both `anon` and `authenticated` hold base-table SELECT grants.
- The expected `public.nfq_public_variant_catalog` does not exist.
- The staged clinical RPC is not deployed.
- Production Vue build disables its data connection. This is why the Variant Explorer displays no records.

No user, variant, search log or clinical record contents were retrieved or written during this check.

## What this proposal does
1. Retains staged `040_public_variant_catalog.sql` as the five-column test projection.
2. Applies `070_authenticated_catalog_gate.sql` in isolated PostgreSQL to deny anonymous catalog reads and direct base-table reads, while allowing the `authenticated` role to select the five-column catalog.
3. Runs denial and success contracts against disposable fixtures through `080_authenticated_catalog_contract.sql`.
4. Uses the existing browser service's **authenticated-only** mode with a verified user session *only after production authorization is independently approved and deployed*.

## Unresolved security/operational gates
- **View-owner and RLS risk:** `040` uses `security_invoker=false`, so the view may bypass underlying RLS. The five-column projection alone does not establish *row-level* eligibility or entitlement. A curated, approval-controlled dataset or a reviewed authorization predicate may be required.
- **Any authenticated account** is broader than an institutionally approved research member. Determine and enforce actual eligibility separately; do not treat a login as sufficient authorization.
- **Legacy compatibility:** revoking `public.variants` SELECT breaks preserved `index.1.html`. The original contains old integrations and is not a sufficient security rollback. Inventory every legitimate operational journey and document the expected cutoff.
- **Owner review:** which nomenclature fields and records are licensable/publishable and whether identifiers can be exposed to signed-in users must be approved by scientific/privacy ownership.
- **True Supabase verification:** exercise real JWTs, anon, authenticated-unapproved, approved, expired/revoked identities, direct REST base table requests, view and RPC behavior, rate limits and audit policy in an authorized isolated project. PostgreSQL mocked `auth.uid()` is not proof.
- **Restore/rollback:** take and test a backup, capture policy/grant signatures, and rehearse a safe reversal before any production SQL.
- **Application build:** only non-secret publishable key and approved endpoint in GitHub Actions; no service-role tokens in Vue, no automatic fallback to `public.variants`, no fake records.

**Release gate remains closed.** No production database migration, permission change, credentials or live read-mode enablement is included in this PR.
