# Phase 14G0 — Production read/write boundary lockdown

**Applied:** 2026-10-19 (Europe/Madrid), in connected Cystic Fibrosis Supabase project, ref `oxlkisjwfarseyqgeyuw`.  
**Operation:** `apply_migration`, migration name `neumuacfq_phase_14g0_public_write_and_helios_lockdown`.  
**Scope:** Database ACL hardening only; no source records, secrets, patient data or reviewer membership were edited.

## Background and preflight

Production GitHub Pages workflow `.github/workflows/live-vue-cutover.yml` builds Vue with `VITE_NFQ_SUPABASE_URL=https://oxlkisjwfarseyqgeyuw.supabase.co` and public catalog reads. The legacy database had permissive mutations for `anon` and `authenticated` across most public tables, raw Helios review exposure, and executable legacy PIN functions.

Before applying, a transaction containing the planned revocations and positive/negative assertions executed successfully and explicitly **rolled back**. Database migrations and security advisor findings were inspected. The repository already contains unapplied proposal SQL in `supabase/migrations/20261015190000_nfq_research_role_foundation.sql` and `20261015191000_nfq_reviewed_write_lockdown.sql`; they are **not** equivalent to this applied migration and must not be assumed applied.

## Applied contract

The following commands were executed within one transaction and committed after SQL assertions succeeded:

```sql
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;

REVOKE SELECT ON TABLE
  public.api_keys, public.audit_log, public.helios_audit_log,
  public.helios_pending_review, public.variant_notes, public.helios_feedback
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.check_write_pin(text),
  public.set_write_pin(text),
  public.helios_claim(bigint,text),
  public.helios_release(bigint,text)
  FROM PUBLIC, anon, authenticated;
```

The migration also guarded for expected `variants` and `evidence_links` anonymous SELECT privileges before and after, no remaining table mutations by either browser role, denied raw anonymous Helios/api_keys reads, and denied executable legacy PIN/Helios claim/release functions by both browser roles.

**Post-apply independent verification:**
- `anon_mutable_tables = 0`
- `authenticated_mutable_tables = 0`
- Public `SELECT` privilege on `variants` and `evidence_links`: **true**
- `anon` raw Helios SELECT: **false**
- `anon` PIN and Helios claim EXECUTE: **false**
- Supabase Advisor no longer flags anonymous/authenticated executable SECURITY DEFINER PIN functions.

**Remaining alerts:** `pg_trgm` and `fuzzystrmatch` extensions located in `public`, leaked-password protection off; `search_history_log` has RLS with no policy. These require separate impact/release reviews.

## Critical limitations and follow-up gates

1. Database SELECT privileges on other raw tables (`validation_history`, `contradictions`, etc.) were **not** revoked during this first step because existing Vue reads need a privacy-safe compatibility migration. Their field/row exposure remains a separate concern.
2. Revoked permissions intentionally suspend direct client scientific writes, including old `index.1.html` operations. This is a security cutover: **do not restore anonymous writes simply to revive old workflows**. Other legacy clients sharing this database may also be affected.
3. Migration SQL was executed via Supabase's migration facility. Do not run this file automatically from GitHub Actions; production access and owner-controlled rollback belong to the database operations workflow.
4. A rollback must be **least-privilege and reviewed**, not blanket `GRANT ALL` or restoration of unsafe policies. A full ACL/policy restore would reopen confirmed security weaknesses.
5. Tests above are server-side privilege checks; live HTTP 403/error-shape acceptance, service-role/server role authorization, sensitive raw SELECT access, transaction concurrency, append-only audit, and user-level release authority have **not** been completed.
6. The new contributor draft and contradiction review packet stay local/export-only. Helios submit/claim/approve remains disconnected. Only an independently authorized backend may perform writes.

## Next steps

- 14G1: approved privacy-safe projection of research chronology; remove broad raw sensitive SELECT when the public projection is deployed and client behavior accepted.
- 14G2: authenticated grant service and trusted transactional review API with immutable events and negative cross-account tests, in isolated staging first.
- 14G3: real Helios research queue and contributor submission activation only after API/staging acceptance and separate production approval.

This document records an **applied** security change. It is not itself a migration runner.
