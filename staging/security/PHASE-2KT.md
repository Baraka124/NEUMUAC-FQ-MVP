# Phase 2K-T: Authenticated Operations and Safe Read Projection

Staging-only prototype. SQL intentionally lives outside `supabase/migrations`; it is **not deployed** to the live Cystic Fibrosis Supabase project. No clinical data is copied.

## Catalog
`040_public_variant_catalog.sql` defines an explicit five-column projection of public.variants and revokes base table SELECT from browser roles. This **will break** all existing direct reads of legacy variant columns until legacy code and modern Vue adapter are moved to a reviewed catalog. Database owner privileges and PostgreSQL view definer semantics must be confirmed in real Supabase.

## Authenticated command boundary
`050_authenticated_clinical_operations.sql` creates staging-only tables for reviewer grants, notes, review decisions and immutable audit events. A single SECURITY DEFINER RPC requires `auth.uid()` supplied by a signed Supabase session, checks server-owned role grants and review state, and atomically records idempotent actions. Browser-supplied identity is not accepted. Its local test mocks Auth only to exercise database semantics; it does **not** validate JWT signatures, true multi-connection concurrency, institutional eligibility or clinical signoff. Grants and review-queue population currently require privileged, audited administrator tooling which is **not yet implemented**.

## Required before production
- Independently confirm view owner, RLS bypass behavior, revoke all inherited column grants and restrict EXECUTE for privileged procedures.
- Require session JWT verification through a real isolated Supabase environment and test role revocation, expiration, CORS and concurrent requests.
- Build trusted admin flow for reviewer grants, scientific verification, initial review creation, audit exports and rollback.
- Migrate the existing Helios, evidence, variant edits, notes and analytics without loss of legitimate workflows. Do **not** activate scripts 010–050 directly.
- Review catalog column-level disclosure policy, real users' access, research licensing and whether even nomenclature should be anonymous.
- Run an approved backup/restore and staged deployment after separate explicit user authorization.

PostgreSQL CI checks verify only disposable local behavior. The connected production database remains untouched.
