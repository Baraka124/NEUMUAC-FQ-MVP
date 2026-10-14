# Phase 0A — Acceptance Report and Next Release Gates

**Date:** 2026-10-14 · **Scope:** documentation-only audit PR; production unchanged.

## Completed in Phase 0A

- [x] Compared the new `main` production baseline to Phase 0 head (source blob unchanged).
- [x] Inspected representative shell, search, variant list/detail, scientific functions, Helios review, genotype, report, auth and audit code.
- [x] Collected 40 individually traceable audit findings; classified 12 P0, 22 P1 and 6 P2.
- [x] Mapped source function anchors, domain responsibilities, database/API references and privacy/trust boundaries.
- [x] Defined non-runtime acceptance criteria for safe architecture and design modernization.

## Not completed and not claimed

- [ ] Authenticated runtime and mobile/tablet screenshots (only user-provided desktop Overview screenshot examined).
- [ ] Database-side RLS/permissions, auth settings, live policies, trigger/RPC implementations or backup restoration.
- [ ] Actual traffic/DNS/Vercel deployment data, clinical validation and compliance assessment.
- [ ] Unit/e2e tests or new CI workflow. No application code is modified in this PR.
- [ ] Clinician feedback, regulated intended-use/CE marking assessment, content licensing and IP ownership.

## P0 technical and scientific blocking findings

FQ-21 maintainable source boundaries; FQ-29 anonymous/session credential authorization; FQ-30 browser PIN hash; FQ-31 role claims; FQ-32 Helios fail-open locking; FQ-33 urgent review guards; FQ-34 non-atomic approval and audit; FQ-35 localStorage retry data; FQ-36 heuristic confidence; FQ-37 CFTR2 evidence provenance; FQ-38 genotype clinical interpretation; FQ-40 CI/branch release gates.

**Priority for verification:** distinguish risks from demonstrated live violations. The code demonstrates a fail-open claim helper and multi-step writes, but the existence, roles and privileges of backend RPCs cannot be inferred. Test only with owner-authorized staging data.

## Proposed next PRs

**Phase 0B — Non-invasive release infrastructure**
- Add CI lint/syntax, HTML smoke, secret checks, source-inventory checks; mark current tests as baseline characterizations, not clinical validation.
- Capture build/deployment source mapping and define preview nonproduction data separation.
- Obtain owner-approved Supabase RLS / grants / RPC / audit evidence and freeze rule fixtures.
- No production runtime changes in first PR.

**Phase 1A — Vue 3 + TypeScript scaffold (dark launch)**
- Create `apps/clinical-web` with Vite, Vue 3, router, optional Pinia, typed domain/API interfaces and tokens.
- Keep `index.html` and CNAME unchanged, with Vercel production build/output setting untouched.
- New app must be development-only and must not import production Supabase URL/credentials or call live endpoints.
- CI checks for bundle type safety, fixtures, build and Playwright navigation using synthetic data.

**Phase 1B — First visual workspace prototype (nonclinical data)**
- Implement shell with deliberate hierarchy, nav, worklist, context area, review state and evidence/provenance badges.
- Demonstrate at 390, 768 and 1366 px, keyboard focus/reduced-motion, dark/light contrast.
- Compare original screenshot with preview; solicit owner/clinical feedback; no route/domain replacement.

**Phase 2 onwards**
- Migrate individual workspaces, one scientific domain at a time. Authorization and clinical golden cases must pass before enabling privileged writes.
- Preserve known-good release and backout procedure. Phase 8 is the only controlled production replacement.

## Acceptance gate for this audit PR

- [x] Docs-only changed file list.
- [x] No `index.html` or `CNAME` changes.
- [x] Source anchors and known unknowns included.
- [x] P0 items prominently captured.
- [ ] CI status: no workflow checks configured in the original repository; not treated as success.
- [ ] User review of priorities and product framing.

## Reviewer emphasis

Clinical product quality is **workflow clarity plus correct scientific semantics plus operational reliability**. It cannot be inferred from expensive styling, color saturation or enterprise aesthetic. Preserve function before modernizing presentation.
