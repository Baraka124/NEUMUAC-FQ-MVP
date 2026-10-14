# ADR-0001 — Modular frontend and staged backend strategy

**Status:** Proposed; architecture selected in principle, release authorization withheld pending production-boundary verification  
**Date:** 2026-10-14  
**Project:** NeumuacFQ — CFTR precision-medicine research and clinical curation platform  
**Baseline:** main @ d0588d768ff03155cd6aeb99e3bee0678c6b2492  
**Scope:** architecture and migration planning; no runtime, DNS, database or deployment changes  
**Related documents:** docs/architecture/PHASE-0-PRODUCTION-BOUNDARY.md and docs/plans/PHASE-0-TO-8-MIGRATION.md

## Decision summary

1. Adopt **Vue 3 + TypeScript + Vite** for the modular frontend, in a separate development/staging deployment initially.
2. Use **Vue Router** for addressable workspaces, **Pinia selectively** for session/workspace state, and explicit service/repository interfaces for data access. Keep clinical computations independently testable and separate from UI components.
3. **Retain existing Supabase PostgreSQL and Supabase Auth initially**. Treat RLS, grants, role claims, server authorization, backups and storage boundaries as unverified until owner-level access supplies evidence. Do not copy production credentials into previews.
4. **Defer Django/Django REST Framework**; evaluate it again after API contracts, clinical domain rules and backend operational requirements have been documented and measured. Django can later implement the same service contracts without requiring replacement of PostgreSQL.
5. Keep **fq.neumact.org serving the legacy app until an explicitly approved cutover**. Vercel production project and preview environment bindings are not verified by the currently accessible Vercel account. No Vercel, DNS, Supabase or production Git branch mutations are authorized by this ADR.
6. Establish automated scientific regression, authorization, accessibility, browser and visual checks before feature-by-feature migration.

## Evidence and current-state constraints

- GitHub repository: https://github.com/Baraka124/NEUMUAC-FQ-MVP
- Repository default branch main and current baseline d0588d7, with two tracked files on main: index.html and CNAME.
- index.html is approximately 2.4 MB and 40,935 source lines; source-level inventory found fourteen style blocks, hundreds of inline handlers, direct DOM rendering, and intertwined application, authentication, persistence, curation, genotype, Helios, reporting and analytics logic.
- The source contains an explicit shared STATE and CONFIG, Supabase API usage, audit/validation functions and external scientific-source integrations.
- The CNAME file specifies fq.neumact.org; it does NOT by itself identify an active Vercel deployment, production branch or alias.
- Vercel access currently shows only unrelated projects; the fq.neumact.org deployment, its connected Git repository, production branch, environment variables and rollback history could not be inspected.
- The current GitHub main is reported unprotected, repository rulesets are empty, and the tracked tree contains no CI workflows or tests. This is a repository-level observation, not a claim about separate tests maintained elsewhere.
- Current database table policies, grants, triggers, auth settings, backup retention and API-edge-function code were not available for inspection. **No assertion of database security, clinical validation or production readiness is made here.**

## Architecture and responsibilities

**Frontend (Vercel, separate development target until cutover)**  
Vue 3 single-file components with TypeScript; Vite build; Vue Router; Pinia only where persistent shared state is required; CSS tokens and scoped styles; reusable accessible clinical components. Layout and interaction are separate from scientific computations.

**Domain layer (framework-agnostic TypeScript)**  
Typed CFTR variant identifiers and nomenclature; source/provenance records; evidence and classification contracts; jurisdiction-specific therapy-reference information; curation states; audit-event formats; immutable fixtures and computational parity tests. Distinguish externally sourced evidence, curated determinations, predictions and unresolved records.

**Data and authorization boundary**  
Supabase client only through a typed repository/adaptor layer; authentication and authorization must be enforced by trusted server/database controls rather than by UI modes, local PIN state or user-editable metadata. Read-only queries, protected writes, review approvals, and reporting must have explicit typed commands and expected responses. No service-role secrets in browser bundles.

**Possible later Python services**  
Django + Django REST Framework, task queue/worker and scientific Python tooling may be introduced for evidence ETL, scheduled federation, computational interpretation, institution-specific integration and governed approval workflows. Python processing should not need to replace PostgreSQL or the Vue UI. If a Python API is introduced, adopt a single clearly documented authority model and avoid unintentionally bypassing Supabase RLS.

## Intended workspaces

- Clinical home and global search;
- Variant worklist, search and variant detail;
- Structured evidence, nomenclature and curation;
- Helios human-review queue;
- Biallelic genotype workspace and jurisdiction-specific reference context;
- Research intelligence and search gaps;
- Reports, exports, provenance and audit;
- Administration and governance, available only where authorized.

Navigation, selection, filters, keyboard focus and traceability must remain coherent across workspaces. The new clinical interface shall not expose unsupported treatment recommendations or imply a validated medical device.

## Deployment topology and isolation

Legacy production remains untouched on fq.neumact.org. A **separate Vercel staging project or explicitly isolated preview configuration** shall serve the new frontend under a non-production URL. The staging build must use a **separate Supabase project or other verified non-production data environment** populated with synthetic/de-identified fixtures. Never trust a preview URL as proof of database isolation. Confirm exact environment-variable targets, project domain aliases and production branch in Vercel before any staged deployment.

Production promotion requires recorded sign-off and rollback rehearsals. Rollback the frontend independently of database migrations; additive/backward-compatible schema changes and tested recovery procedures are prerequisites.

## Options assessed

**Vue 3 + TypeScript + Vite — selected:** excellent incremental composition, explicit typed boundaries, well-suited for nuanced clinical workspaces; reduces complexity for current scope.

**React + TypeScript — viable alternative:** mature ecosystem and broad recruitment base; migration and clinical governance obligations identical. No demonstrated requirement justifies a React-specific advantage here.

**Angular — not selected:** structured and enterprise-capable, but its additional conventions are not necessary for this product stage.

**Retain monolithic HTML/CSS/JS — rejected as target:** lowest immediate code movement but too costly for safe evolution, tests, isolated business rules and large-team contribution.

**Immediate Django backend replacement — deferred:** would multiply authorization, API, deployment and data-model change risks before the existing production boundary is verified.

## Consequences and trade-offs

- A temporary dual-frontend period and adapter layer are accepted to protect existing behavior.
- New UI work is intentionally slower until fixture and parity testing is established.
- Core scientific rules receive tests independently of components and network state.
- React or Django could be adopted later with a new ADR if evidence changes.
- Vercel project ownership/connection is an explicit unresolved operational dependency.

## Django reconsideration triggers

Revisit Django when at least one is evidenced: complex server-side clinical approval workflow; repeated scientific pipeline jobs that exceed existing Edge Function capabilities; many external evidence integrations needing centralized orchestration; institution-level tenancy/integration requirements; regulatory evidence demanding stronger backend separation; or measurable operating constraints. Compare Django with a Supabase Edge Function + worker approach using cost, risk, auditability, team skills, portability and operational responsibility.

## Mandatory decision gates before implementation

- Vercel owner confirms actual project, domain, branch and production/preview bindings.
- Supabase owner confirms RLS/grants and auth/roles from authoritative configuration, with allow/deny tests.
- Staging uses isolated data and separate credentials; no production writes from tests.
- Legacy feature inventory and scientific golden cases exist.
- Data ownership, consent/retention, intended clinical use and IP rights have identified accountable reviewers.
- CI and branch-protection design is approved; no direct edits to production main.

## Official technical references

- Vercel environments: https://vercel.com/docs/deployments/environments
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase data security: https://supabase.com/docs/guides/database/secure-data
