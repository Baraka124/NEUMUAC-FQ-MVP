# Phase 2M-E · Public CFTR variant catalog

Public visitors should browse approved five-field CFTR nomenclature without login. Staff changes require separate authenticated and role-authorized paths.

**Current state:** 2,234 real variant records exist in the live database. The expected `nfq_public_variant_catalog` view is absent; the GitHub Pages build explicitly disables all variant reads. This is why the new UI is empty.

**Important security blocker:** The existing `public.variants` base table currently permits anonymous and authenticated SELECT, INSERT, UPDATE, DELETE, TRUNCATE and other privileges. Multiple other public tables also have broad grants. Do not enable or claim public *read-only* access by merely revealing a publishable key in the frontend. A client-side read-only API does not prohibit direct calls to the database.

**Deployment gate:** In authorized staging, implement a five-field public read projection (`id`, `legacy_name`, `protein_name`, `cdna_name`, `alt_names`) preserving RLS semantics. Test anonymous successful reads, denied writes, sensitive field denial, separate authenticated staff permissions and real browser behavior. Audit dependent legacy reads/writes before revoking table grants: the frozen `index.1.html` accesses more than these five columns. Complete backup/rollback planning and request separate approval for a production database privilege migration. Never re-enable unrestricted `GRANT ALL` on rollback.

**Frontend gate:** Build the Vue app with the public project endpoint and publishable/anon key only after the catalog and read-only permissions are independently verified. Keep privileged keys out of GitHub and browsers. The UI must display genuine records only and retain honest disconnected and denied states.

Do not describe staging CI as live Supabase verification. No live database changes are authorized by this documentation.
