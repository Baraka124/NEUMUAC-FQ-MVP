# Phase 0B — CI Safety Baseline and Security Boundary Register

**Scope:** Additive test/tooling changes only. **Production runtime unchanged** (`index.html`, `CNAME` not edited).  
**Baseline:** `index.html` Git blob `c18221fb6baf47782318ca3685b94b088c359a66`.

## Added CI safeguards

- Node 22 dependency-free characterization tests (`node --test tools/phase0b-baseline.test.mjs`).
- Frozen legacy entry point Git blob comparison; updating the application intentionally requires updating the baseline in a reviewed PR.
- CNAME invariant for `fq.neumact.org`.
- Inline JavaScript syntax check using `node --check`, with expected script-count and critical DOM/function anchors.
- Narrow secret-pattern check for JWT-like values and tracked `.env` files. The one existing public Supabase `anon` JWT within frozen `index.html` is allowed **only as known baseline**; service-role and newly added JWTs are rejected. This scanner is *not exhaustive* and does not validate RLS or other credential classes.
- PR, main-push and manual GitHub Actions triggers. No browser/server/database connections are made.

## Interpretation

These tests are a minimum **regression gate**, not clinical functional parity, production security certification, RLS verification, browser smoke or accessibility acceptance. The scientific and governance P0 findings in the Phase 0A audit remain open. CI does not change the underlying client-side authorization design.

## Remaining blockers before clinical functionality migration

- [ ] Owner-authorized inspection of Supabase RLS/grants, RPC implementations, auth claims and backup/restore.
- [ ] Confirm Vercel deployment isolation for future branches and new Vue build; avoid preview builds pointed at production.
- [ ] Add clinical golden fixtures and adversarial role authorization tests, browser journeys and visual tests using synthetic data.
- [ ] Protect main with required GitHub checks/reviews (repository settings; no automation performed here).
- [ ] Review FQ-29 to FQ-38 P0 security/data/clinical findings.
- [ ] Confirm audit logs remain complete and write-mode requests cannot elevate privileges.

## Phase 0B acceptance

- [x] Additive tooling/CI only; production files unchanged.
- [x] Self-testing guard implementation included.
- [ ] CI must pass on PR. **Do not merge a failing PR.**
- [ ] Require future code PRs to run checks before release.
- [ ] Production database security sign-off remains outstanding.

## Follow-on scope

Phase 1A can add `apps/clinical-web/` and nonproduction Vue/TS/Vite scaffolding while explicitly preserving existing production `index.html` and `CNAME`. The new app must not contact live Supabase data from CI or previews. Do not switch Vercel build settings, DNS, or production entry point until fully accepted.
