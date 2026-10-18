# neumuacFQ · 14G1–14G3 security and review integration

## 14G1 — Applied to the active Supabase production database, 2026-10-19

Project: `oxlkisjwfarseyqgeyuw`, identified in the GitHub Pages build workflow for `fq.neumact.org`. Supabase migration: `neumuacfq_phase_14g1_history_column_privacy`.

Following a successful rollback-only dry run, revoked table-wide `SELECT` on `public.validation_history` and `public.contradictions` for `PUBLIC`, `anon` and `authenticated`. Granted column-select access for only the existing read-only Vue `liveResearchHistory.ts` fields:

- Validation: `id,variant_id,action,created_at,confidence_level,snapshot_cftr_class`
- Contradiction: `id,variant_id,field,severity,resolved,detected_at,resolved_at`

Replaced blanket anonymous read policy with `nfq_public_validation_metadata` and `nfq_public_contradiction_metadata`, granting only metadata rows (no personal notes, clinician names, sessions or raw conflict details through these grants).

**Independently verified** as both effective grants and an anonymous PostgreSQL role query: safe fields readable; raw table SELECT and confidential fields inaccessible. This retains *existing row-level visibility of approved metadata*; it does NOT establish that any particular historic value is independently accurate. No stored evidence or validation row was changed. Database writes remain disabled after 14G0.

## 14G2 — Trusted backend: current acceptance status

**Not activated.** Production contains legacy Helios RPCs and tables but they are no longer callable/writable by browser roles. No new privileged transaction service, authenticated contributor assignment or immutable review event ledger is deployed. The existing `domain/trustedReviewModel.ts` is an offline specification, not an identity or authorization service.

Already staged in repository: `staging/security/120_verified_research_memberships.sql` and `130_verified_research_memberships_contract.sql` test unique, self-visible memberships and deny client mutation without bootstrapping a production admin. `ADR-0004-trusted-review-backend.md` enumerates transactional decisions, role separation, evidence digests, independent release and required adversarial tests.

**Release gate (all must pass on isolated Postgres before any production DDL):**

1. Distinct contributor/reviewer/administrator roles are server-assigned and verified against `auth.uid()`; never `user_metadata`, UI labels or caller-supplied names.
2. Only an authenticated proposer can submit their own source-scoped draft; only an independent authorized reviewer can attest. No self-review, role substitution or impersonation.
3. Review transition, immutable event, idempotency key and version check commit in **one transaction**; simultaneous reviewers cannot both claim the previous version.
4. Rejection remains attributable; no silent overwrite; evidence source digests and scope are verified on the server.
5. Anonymous, signed-in nonmember and cross-account reads/writes/RPC calls are rejected; role grants are audited and revocable.
6. Staging tests exercise request replay, mismatched fingerprint, rolled-back failure, concurrency, and denied audit editing.
7. Production approval and independently verified HTTP acceptance occur after migration and before Helios write UI is unlocked.

## 14G3 — Helios connection: current activation status

**Read-only preparation, not connected.** The new source-linked local correction proposal (14E) and review packet (14F) remain local downloads, not server submissions. No claim, approve, reject, release, or raw Helios-table query is enabled. Helios's public area continues to show a truthful unavailable state until an authorized API is deployed.

Do not bridge authorization from neumDESK or reintroduce the previous shared PIN/legacy client claims. When backend verification is complete, connect a narrow, server-filtered review list first; only later connect mutations with tested revision locks and audit trail.

## Outstanding verification

- Live browser end-to-end GET acceptance on `fq.neumact.org` after 14G0–14G1: **not yet passed in this phase**; unit tests and PostgreSQL privilege tests are not substitutes.
- Independently verify the full catalogue SELECT permissions, all REST error responses, and continued absence of sensitive fields in public network payloads.
- Database security advisories for extensions in `public` and disabled leaked-password protection remain separate remediation work.
- 14G0 and 14G1 use Supabase migration history; this repository document does not automatically execute SQL.
