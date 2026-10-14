# NeumuacFQ — Phased Enterprise Migration Plan

**Status:** Proposed · **Phase 0 documents only** · **Date:** 2026-10-14  
**Target:** Vue 3 + TypeScript + Vite; existing Supabase retained initially; Django deferred pending evidence.  
**Source:** main at d0588d768ff03155cd6aeb99e3bee0678c6b2492.  
**Contract:** [ADR-0001](../architecture/ADR-0001-modular-frontend-and-backend.md) and [Production boundary](../architecture/PHASE-0-PRODUCTION-BOUNDARY.md).

## Migration strategy

Use a **strangler-style migration**: preserve the monolith as the functional reference while constructing independently tested workspaces in a separate Vue application. Establish shared typed domain contracts and validated adapters first. Do not simply extract CSS/JS in place and assume equivalence. Maintain comparison fixtures for legacy and modern implementations.

The public domain `fq.neumact.org`, its Vercel project, database and DNS remain unchanged until explicit approved cutover. A development branch is not a staging environment until runtime configuration and database isolation are verified.

## Phases and acceptance gates

| Phase | Deliverables | Exit criteria | Production impact |
|---|---|---|---|
| **0A — Baseline and inventory** | Source/function map; routes/screens, dependencies, state mutations, network endpoints, clinical rule inventory; UI/UX issue audit; ADR and migration contract | Every essential user journey mapped with owner and risk; unresolved features tracked | None |
| **0B — Trust and deployment boundary** | Verified Vercel project, branch, domain; Supabase policies/roles/backup evidence; role/action matrix; staging data design | G0 and G1 verified; no key or sensitive data leaks; high-risk controls documented | None |
| **1 — Build foundations** | Vite/Vue 3/TS skeleton; Vue Router; component conventions; lint/typecheck/Vitest/Playwright; CI; isolated preview | Build & smoke green; production untouched; separate staging backend | None |
| **2 — Design system and shell** | Tokens, typography, navigational shell, search affordances, responsive grid, keyboard/focus/dialog primitives; clinician/curator shell | Accessible at 390/768/1366+ px; keyboard journey and snapshots green | None |
| **3 — Variant worklist and detail** | Typed variant/search repositories, search/alias/indexing, filters, detail and external provenance; compare against frozen baseline | Search/variant cases parity including case-insensitive names, misses, filters, class labels, permissions | None |
| **4 — Evidence and curation** | Evidence citations, classification history, safe edits, validation, inter-rater conflicts, audit, nomenclature correction | Scientific goldens pass, role-based write-deny tests pass, audit trace complete | None |
| **5 — Helios and genotype** | Review inbox, explanation and authorization for proposed changes, compound genotype, jurisdiction-aware context | Human approval required; explicit data uncertainty and provenance; parity and safety review signed | None |
| **6 — Analytics and reporting** | Search intelligence, gap prioritization, reports/exports, cached views, responsive tables | Metrics reconcile with fixture calculations; deterministic export tests; sensitive data boundaries approved | None |
| **7 — Operational and clinical hardening** | Security review, performance budgets, threat model, accessibility, observability, incident/backup and intended-use assessment | All critical findings closed or risk accepted by accountable owner; restore rehearsed | None |
| **8 — Controlled rollout** | User acceptance, staged pilot, release record, rollback practice, controlled custom-domain cutover | Clinician, technical and data-owner sign-off; post-release checks pass | Explicitly approved change only |

## Canonical module layout (proposal, not yet implemented)

```text
apps/
  clinical-web/
    index.html
    src/
      app/                 # bootstrap, router, Pinia
      layouts/             # shell and workspace containers
      workspaces/
        home/
        variants/
        evidence/
        curation/
        helios/
        genotype/
        intelligence/
        reports/
        governance/
      components/          # accessible, shared primitives
      styles/              # tokens, reset, typography, layout
      services/            # typed external adapters
      tests/               # user journeys and visual snapshots
packages/
  clinical-domain/         # typed clinical rules, schemas, fixture tests
  api-contracts/           # DTOs, repositories, error/result types
docs/
  architecture/
  plans/
  quality/
```

No `index.html`, `CNAME`, Supabase tables, functions or domain settings should be modified until development and release governance is authorized.

## Scientific behavioral invariants

Maintain fixtures for:
- canonical/legacy/protein/HGVS alias matching, case-insensitive lookup and search-miss logging;
- variants with unknown, partial, contradictory and fully curated evidence;
- mutation class and modulator-reference provenance, with geographic jurisdiction rules;
- two-allele genotype interpretation, including uncertain and absent evidence;
- Helios queue proposal → human review → approved/rejected → audited change;
- conflicting validators, nomenclature changes and historical version preservation;
- export outputs, missing-data rates and search analytics;
- unavailable external sources and partial outages; no fabricated evidence or misleading certainty.

Each algorithm or scientific-rule change must be proposed and approved independently from a UI migration. Test data must be synthetic or appropriately de-identified.

## CI and merge requirements

Start with TypeScript typecheck, ESLint, unit tests for adapters/domain rules, isolated integration tests with staging Supabase or mocks, Playwright end-to-end navigation/keyboard/accessibility tests at mobile/tablet/desktop, performance smoke, dependency/secret scanning and build checks. Protect main; use reviewable PRs; no direct merges to production. Visual tests must verify typography, overflow, motion/reduced-motion, focus visibility and clinical-workflow readability, not just screenshot similarity.

Keep the original reference implementation available for parallel test comparison. Record actual GitHub/Vercel deployment bindings before enabling any automatic preview that could connect to production.

## Database transition and Django decision checkpoint

Keep existing PostgreSQL as authoritative initially. Capture SQL schema, RLS policies, grants, triggers, RPCs, jobs, Edge Functions and migrations in a controlled source-of-truth repository **only after validating owner permissions**. Use versioned schemas and additive migrations; data synchronization or backfill requires a reviewed plan.

After Phase 4 (or earlier if evidence justifies), produce ADR-0002 comparing (a) Supabase RPC/Edge Functions + workers and (b) Django REST Framework + background workers. Evaluate needs for evidence federation, clinical review authorization, repeatable computation, institutional integrations, tenancy, operations, cost, auditability and team expertise. Django may run as a separate Python service; do not assume Django must be on Vercel.

## Deployment and rollback plan

1. **Before any environment change:** prove the Vercel owner, current production commit and domain mapping; verify preview settings and production env-variable scopes. Document live rollback method.
2. **Before code experiments:** create a separate Vercel target and isolated nonproduction Supabase with test-only data.
3. **During migration:** keep `fq.neumact.org` on legacy; develop under independent URL; compare essential journeys and role permissions.
4. **Before pilot:** freeze release candidate; rehearse restoring frontend and database separately; confirm backward-compatible data-model transitions.
5. **At cutover (Phase 8 only):** named operator and approver, change window, deployment pin, health-check list, rollback trigger, audit trail.
6. **After cutover:** monitor errors, missing data, performance, evidence integrity and user feedback; keep legacy rollback accessible until approved retirement.

## No-go conditions

No cutover with unverified project ownership, production preview connections, RLS/grants, authorization controls, backup/restore status, scientific parity, serious security issues, or unresolved clinical safety questions. The new UI is not proof of clinical validation or legal medical-device compliance.

## Phase 0 next actions

1. Confirm project/deployment/domain in the correct Vercel account.
2. Provide redacted non-secret project settings and deployment binding evidence; never share secret values.
3. Gather Supabase RLS/policy/schema/backup configuration under appropriate owner access.
4. Inventory and score functional screens, all API endpoints and clinical logic from source.
5. Create independent staging infrastructure only after the boundary is verified.
6. Implement Phase 1 on a separate branch/PR when approved.
