# Phase 2K — Supabase integration hardening (verification pending)

## What is established from the legacy implementation
The frozen root `index.html` calls `/rest/v1/variants`, using `legacy_name`, `protein_name`, `cdna_name`, `alt_names`, and `evidence_links`. The legacy site uses an anon key for default reads and separately maintains a Supabase auth session. This is repository evidence, **not an independent inspection of production PostgreSQL schema or RLS policies**.

## Security decisions
- New Vue frontend starts disconnected by default and uses only real database records when configured.
- Read access defaults to **authenticated**. Without a trusted session provider the adapter rejects reads; it never silently downgrades to anonymous.
- A publishable key is provided in `apikey` and is not itself a JWT. Signed-in user JWT goes in the `Authorization: Bearer` header. Legacy JWT anon key is treated separately in explicitly enabled anonymous mode.
- The adapter uses GET only with explicit projected fields and pagination, disables fetch caching, rejects query punctuation capable of changing PostgREST filters, never uses a privileged key or fake variant fallback.
- Real application session integration and a proper sign-in UI are **not yet implemented**. An owner-approved public data policy could permit `VITE_NFQ_READ_ACCESS_MODE=anonymous` only after independent RLS assessment.

## External integration blocker
The Supabase project is not connected to this session. The available Supabase integration can verify database grants, RLS policies, schemas and actual authenticated/anonymous read behavior after the user connects it. No production requests using exposed legacy keys have been made, and **no Supabase SQL, policy, table or data have been changed**.

## Required real-database checks
1. Confirm the exact project and intended visibility of `public.variants`; avoid making sensitive records anonymous-readable.
2. Inspect schema types of `variants.id`, names and `alt_names`; confirm indexes and whether text search can safely meet needed use cases.
3. Inspect whether RLS is enabled, effective SELECT policies for `anon` and `authenticated`, and underlying table grants (both matter).
4. Verify restricted column visibility and reject `select=*` on potentially sensitive clinical or provenance columns.
5. Test authorized session identity, expiry/refresh, 401/403 and CORS, and an anonymous denial if anonymous access is prohibited.
6. Only after these checks, wire an authenticated Supabase session to Vue. Never store a service-role/secret key in the client.
7. Keep the root production `index.html` and `CNAME` until the modern app displays authorized real data and the owner approves cutover.
