# Phase 0 — Production Boundary and Verification Register

**Date:** 2026-10-14 · **Read-only audit** · **Baseline:** main at `d0588d768ff03155cd6aeb99e3bee0678c6b2492`

## Baseline evidence register

| Area | Current evidence | Status |
|---|---|---|
| GitHub repository | Public `Baraka124/NEUMUAC-FQ-MVP`; `main` is default | Verified |
| Source inventory | Main tree contains only `index.html` and `CNAME`; runtime application is monolithic | Verified |
| Domain association | CNAME text is `fq.neumact.org` | Repo configuration verified; live hosting unverified |
| GitHub protection | `main` reports `protected: false`; rulesets endpoint returned `[]` | Verified for observed GitHub configuration |
| CI | No workflow or test files in `main` tree | No repository-local CI verified |
| Vercel ownership | Accessible Vercel account lists unrelated projects; hostname deployment lookup did not identify the project | Not verified |
| Production/preview Git bindings | Exact production branch, deployment SHA, alias and preview configuration unknown | Blocking verification |
| Supabase backend | API endpoints and Supabase Auth client present in application source | Source configuration only |
| RLS, roles and permissions | No authoritative policy/grant/config access | Blocking verification |
| Backups, PITR and retention | Not inspected | Blocking verification |
| DNS/TLS/public response | Cannot independently establish public serving infrastructure in current environment | Not verified |
| Production database schema and edge functions | Not tracked in repository; authoritative backend artifacts absent | Not verified |

**Interpretation:** the user's report that the live application runs under Vercel may be correct. The accessible Vercel account is not sufficient to establish the deployment binding. Do not interpret missing project visibility as proof the site does not exist.

## Production safety boundary (hard rules)

1. No changes to main, existing Vercel projects, production DNS, custom-domain aliases, Supabase production project, schema, RLS, policies, credentials or production data during Phase 0.
2. No development deployment shall use a production database URL, even for read-only testing, unless an explicitly designed, independently reviewed read-only data channel is authorized. Prefer synthetic fixtures.
3. A new Vercel preview is **not** by itself isolated from Supabase; verify every environment variable and data destination.
4. Never put privileged backend keys in browser bundles or public documents. Audit client-side write guards versus server-enforced authorization. Public Supabase anonymous/publishable keys must rely on rigorously validated RLS.
5. Do not publish real patient data, identifying clinical notes, production audit log exports or access credentials into Git, preview builds, test artifacts, screenshots, bug reports or logs.
6. Production and nonproduction data must have distinct projects and credentials. Audit any local browser caches/retry queues for sensitive content and replay behavior.
7. Before migration, create a versioned release baseline and read-only export/backup plan using authorized methods; verify restore procedures and ownership.
8. A cutover must have a written operator, approval, timestamp, smoke-check record, and defined rollback authority. Database changes require separate reversible, backward-compatible procedure.

## Read-only checks for Vercel project owner

Provide **nonsecret evidence**, such as redacted settings screenshot or project metadata: project ID/name, team scope, connected Git repository, production branch, assigned `fq.neumact.org` domain, latest production deployment SHA/status, build command/output directory, environment variable **names and scopes only**, preview protection, deployment logs access, rollback availability and auto-deploy behavior. Do not paste tokens or env values into documents or chat.

Check whether the CNAME is an artifact of an earlier static hosting setup rather than current Vercel configuration. CNAME alone proves nothing about active serving topology.

## Read-only checks for Supabase owner

Document project identity (nonsecret), separation of production/staging, table inventory, RLS enabled per exposed table, policy definitions and privileged grants, user identity and role source, storage policies, Edge Functions, custom RPCs, authentication settings, backup/PITR availability, region, audit data sensitivity and retention. Use authoritative dashboard/SQL under an authorized account; never publish secrets or patient information.

**Priority checks** based on inspected frontend:
- Several operations construct REST calls with the public anonymous key; determine whether database policies enforce intended privileges when unauthenticated.
- Client-visible write-PIN digest/fallback and UI write mode are not sufficient server-side authorization.
- Verify the security of queued offline writes and retries, including session freshness and idempotency.
- Ensure clinician/curator approval permissions are determined server-side, not solely via editable user metadata or client application mode.
- Check authentication-dependent endpoints individually, including audit logs, validation records, genotype assessments, Helios proposed changes and exports.
- Assess unsafe injection surfaces for dynamic HTML rendering and ensure CSP is appropriately hardened.

Record each concern as **unverified risk**, not confirmed exploit, until controlled authorization tests corroborate it. Perform tests only in owned staging environments with synthetic data.

## Minimum verification gates

- **G0 — Production boundary verified:** Vercel project/branch/domain confirmed; rollback pathway documented; current production source SHA archived.
- **G1 — Staging isolated:** separated Supabase URL and credentials; synthetic records; no production keys; preview protection applied.
- **G2 — Authorization verified:** role matrix and database-level allow/deny tests for reads, writes, curation, review and audit.
- **G3 — Clinical baseline preserved:** frozen datasets and deterministic examples for variant search, classification, genotype, therapy provenance, exports and review.
- **G4 — Release safety:** PR-only changes, CI green, staging approval, backup/restore rehearsed, explicit cutover sign-off.

## Outstanding owner actions

- [ ] Identify Vercel team/project currently serving fq.neumact.org.
- [ ] Confirm production branch, deployed commit, environment scopes and deployment triggers.
- [ ] Confirm separate non-production Supabase project and synthetic fixtures.
- [ ] Export authoritative database policy and schema inventory for private review.
- [ ] Assign reviewers for clinical safety, privacy, data/IP ownership and technical security.
- [ ] Agree access boundaries, PR approvals and branch protection before application changes.

**Current readiness:** Architecture planning may proceed. Deployment, backend changes and production cutover are **not approved**.
