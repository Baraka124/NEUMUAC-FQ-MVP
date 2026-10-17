# Phase 4F-11I — Existing CFTR database review before synonym curation

**Verified live project:** Connected Supabase project **Cystic Fibrosis** (`oxlkisjwfarseyqgeyuw`), inspected read-only on 2026-10-18 using `list_tables`, public schema. **No SQL, migration, grant, policy, insert or update was executed.** Row counts returned by table metadata are estimates and do not establish live-record completeness.

## Existing structures — reuse before introducing duplicates

| Existing table | Relevant fields observed | Considerations |
|---|---|---|
| `public.variants` | `id bigint` PK, `legacy_name`, `protein_name`, `cdna_name`, `alt_names text`, `field_provenance jsonb` | Canonical variant identity already exists; `alt_names` does not itself encode separately reviewed relationships |
| `public.helios_pending_review` | `id`, `variant_id`, `item_type`, `proposed_field`, `proposed_value`, `evidence_payload`, `status`, `reviewed_by`, `claimed_by`, `claim_expires_at` | Existing review inbox and claim lifecycle potentially extensible, but no assumption that the current item-type validator accepts aliases |
| `public.helios_audit_log` | `review_id`, `action`, `variant_id`, `review_snapshot`, `created_at`, `clinician_name` | Existing audit trail; must verify transactional writes, immutability, permissions and foreign keys before reuse |
| `public.validation_history` | `variant_id`, `action`, `notes`, `created_at`, `session_id` | Records scientific validations, not automatically synonymous with alias approval |
| `public.audit_log` | `action`, `target_type`, `target_id`, `created_at` | General audit record may complement but must not substitute for reviewed evidence provenance |
| `public.validator_roles` | `role_name`, `usage_count` | Role-name autocomplete does not prove an authorization model |

All listed public tables reported `rls_enabled:true`; that **does not establish policy correctness, write authorization, immutable audit, or completeness**. Existing proposed alias domain contracts (11G/11H) are local logic and do not enforce server-side decisions.

## Proposed Phase 11I architecture: hold writes until verified

1. Define alias proposal as a typed `helios_pending_review` item **only if** existing database CHECK constraints, API contracts, and RLS permit the new item type. Otherwise develop a dedicated relation with a reviewed migration and links to `variants.id` and audit events.
2. Require: canonical variant ID, exact proposed alias, authoritative supporting source identifier/URL, relationship type, submitter auth user ID, timestamp, review state, evidence snapshot/version and rationales.
3. Decisions: use authenticated reviewer identity backed by server-side roles; prevent self-approval, enforce claim ownership and expiration, require state-version/CAS concurrency control.
4. Make audit writes atomic with review decisions and append-only under direct and API access. Test privilege escalation and DENY cases for anon, submitter, unrelated authenticated user, reviewer and admin.
5. Only after independent scientific approval, make a **separate governed promotion decision** for `alt_names`/search index; no mutation from a mere local `state:'approved'` flag.
6. Separate public-read search discovery from write authorizations. Public read remains limited to permitted fields; no reviewer personal data leaked via exposed views or endpoints.

## Owner/clinical review gates before any SQL

- Confirm this connected project is the same environment serving `fq.neumact.org`, and identify staging vs production.
- Read database policies, triggers, constraints, grant matrices, existing authenticated profiles/roles, Helios status transitions and audit transaction paths in detail.
- Decide reuse versus new proposal table, canonical alias uniqueness and case/accent semantics, revoked alias handling, source retractions and reversibility.
- Validate live API and migrations in isolated development environment before production application. No synthetic production data.
- Confirm clinical intended-use and review ownership with CFTR research leads; no implied clinical validation.

**Status:** source-backed schema inventory and governed architecture plan **only**. NFQ-003–006, NFQ-017–023 and Helios review parity are not declared complete.
