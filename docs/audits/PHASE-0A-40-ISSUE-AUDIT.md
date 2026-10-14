# Phase 0A — Source-Grounded Clinical UX and Architecture Audit

**Date:** 2026-10-14 · **Status:** reviewed-source baseline / actionable audit, not runtime validation  
**Repository:** `Baraka124/NEUMUAC-FQ-MVP` · **Production baseline:** `main` at `9889fa776689d30bf8180a4f433fe9bc44f04127`  
**Application source:** `index.html` (same blob as original baseline; SHA `c18221fb6baf47782318ca3685b94b088c359a66`)  
**Visual reference:** user-supplied desktop screenshot, 1806 × 832, 2026-10-14. Image is not committed to repository.  
**Scope:** inspection and design requirements only; no application, deployment, data or clinical-rule changes.

## Interpretation and severity

- **S** screenshot-observed; **C** code-observed; **R** further runtime, database or clinical review needed. Combined markers carry both types.
- **P0** blocking security, scientific safety, data integrity, or future release-governance item. **P1** material usability / architecture / workflow issue. **P2** refinement with lower immediate risk.
- A **source-identified risk is not proof of a production exploit**. Security/clinical concerns are conditional on policies, deployment and actual data use. No patient data, credentials or secret values are reproduced here.
- These are **40 audit findings**, not a claim that every item was reproduced across browsers or clinical accounts. Maintain this evidence distinction in PRs and executive presentations.

**Count:** 40 findings (P1 22; P2 6; P0 12). Numbers are audit IDs, **not recommended implementation order**.

## Findings

### FQ-01 · Header overload

**Priority:** P1 · **Area:** Shell · **Evidence:** S

**Finding:** The masthead packs status, search, language, shortcuts, jurisdiction, clinical/curator mode, institution and overflow into one narrow horizontal band.

**Required direction:** Move task navigation to a workspace system; reserve header for identity, global search, authenticated user and one context control.

**Trace:** Screenshot top 0–70px; index.html L6061–6215

**Acceptance check:** At 390/768/1366 widths all primary actions accessible without collision.

### FQ-02 · Ambiguous segmented status bar

**Priority:** P1 · **Area:** Shell · **Evidence:** S

**Finding:** A coloured bar marked critical and total variants looks like platform health but does not explain denominator or action.

**Required direction:** Move operational coverage into Overview and provide definitions and action drilldowns.

**Trace:** Screenshot masthead; L6075–6088

**Acceptance check:** Users correctly explain status meaning in moderated task test.

### FQ-03 · Two competing searches

**Priority:** P1 · **Area:** Search · **Evidence:** S+C

**Finding:** Global toolbar and left worklist expose overlapping search affordances, risking divergent scope and state.

**Required direction:** One canonical search state; explicit global command vs in-worklist filtering where required.

**Trace:** Screenshot; L6061–6132, L6362–6381; searchVariants L12785

**Acceptance check:** Same query gives coherent results and back/forward state.

### FQ-04 · Icon-only shortcuts lack discoverability

**Priority:** P1 · **Area:** Navigation · **Evidence:** S

**Finding:** Batch lookup and toolbar controls are visually cryptic and weakly prioritized.

**Required direction:** Accessible labels, tooltips, keyboard shortcuts and meaningful grouping; no mystery-action cluster.

**Trace:** Screenshot; L6104–6129

**Acceptance check:** Keyboard and first-time user can identify actions.

### FQ-05 · Jurisdiction, mode and write privilege intermixed

**Priority:** P1 · **Area:** Context · **Evidence:** S+C

**Finding:** EU/FDA/MHRA context sits beside clinical/curator presentation mode and lock; regulatory reference and authorization are different concepts.

**Required direction:** Separate jurisdiction context, workspace mode and verified user permissions; label each independently.

**Trace:** Screenshot; L6153–6191, L8329–8345

**Acceptance check:** Users cannot mistake a view toggle for clinical authorization.

### FQ-06 · No durable task-oriented navigation

**Priority:** P1 · **Area:** Information architecture · **Evidence:** S+C

**Finding:** Landing surface is KPI/dashboard-led; named scientific workflows compete inside header and overlays.

**Required direction:** Addressable Overview, Variants, Evidence, Helios, Genotype, Intelligence, Reports, Governance routes.

**Trace:** Screenshot; L6523–6630; Helios L30656

**Acceptance check:** Every core task has explicit location and return path.

### FQ-07 · Tiny high-density labels

**Priority:** P1 · **Area:** Typography · **Evidence:** S

**Finding:** Meta text, class chips, buttons and chart annotations are considerably smaller than main reading text.

**Required direction:** Define legible typography tokens; reserve monospace for variant strings; avoid dense 9–10px clinical labels.

**Trace:** Screenshot navigation, variants, briefing; L6105–6170

**Acceptance check:** Clinical reading copy meets agreed legibility at 100% zoom and 200% scaling.

### FQ-08 · Mixed English and Spanish within tasks

**Priority:** P1 · **Area:** Localization · **Evidence:** S+C

**Finding:** Landing mixes Spanish greeting/date and English status, queues and buttons.

**Required direction:** One coherent locale per session, complete translation inventory, bilingual scientific nomenclature unaffected.

**Trace:** Screenshot; toggleLanguage L14405; L6553

**Acceptance check:** Switching locale translates navigation, alerts, errors and review states consistently.

### FQ-09 · Variant rows hide important context

**Priority:** P1 · **Area:** Worklist · **Evidence:** S

**Finding:** Rows show variant identifiers, p.?, class and scattered chips without explicit evidence/validation status hierarchy.

**Required direction:** Design typed worklist row with primary name, aliases, evidence state, review priority, last update and clear selected state.

**Trace:** Screenshot left column; renderVariantList L18963

**Acceptance check:** Clinician can identify next action from the row alone.

### FQ-10 · Filter panel over-dense

**Priority:** P1 · **Area:** Worklist · **Evidence:** S+C

**Finding:** All/ETI/exceptional/incomplete, Roman class filters, sorting and tips consume substantial space above results.

**Required direction:** Progressive filter disclosure, saved views and a concise active-filter summary.

**Trace:** Screenshot left rail; L6357–6503

**Acceptance check:** Filters retained across selection and restore without layout jump.

### FQ-11 · Selection and pagination weakly contextualized

**Priority:** P2 · **Area:** Worklist · **Evidence:** S

**Finding:** A 'Select' control and pagination live separately from the active variant list and selection intent.

**Required direction:** Explicit batch mode only when entered; item count and pagination adjacent to worklist footer.

**Trace:** Screenshot left 300–820px; L6503

**Acceptance check:** Batch selection flows without accidental single-item navigation.

### FQ-12 · Priority score 100/99 lacks scale explanation

**Priority:** P1 · **Area:** Priority · **Evidence:** S

**Finding:** Red numerical chips appear urgent but no scoring rationale, threshold or accountable action is exposed.

**Required direction:** Surface named severity, contributing dimensions, provenance and recommended review, not anonymous scores.

**Trace:** Screenshot Curation Priority; L29778

**Acceptance check:** User explains why a case is above another.

### FQ-13 · Search volume may overshadow clinical importance

**Priority:** P1 · **Area:** Priority · **Evidence:** S

**Finding:** Priority rows display query counts as rightmost context; high search frequency need not mean clinical severity.

**Required direction:** Differentiate scientific impact, missing evidence, exposure/search demand and critical review urgency.

**Trace:** Screenshot queue; L29716–29807

**Acceptance check:** Triage priorities trace to explicit reviewed policy.

### FQ-14 · Helios panel is largely empty despite urgency

**Priority:** P1 · **Area:** Helios · **Evidence:** S

**Finding:** Half of primary canvas is an underutilized briefing panel with two wide generic actions.

**Required direction:** Replace with actionable review queue (pending, evidence conflicts, owner, next approval), with expandable briefing.

**Trace:** Screenshot lower right; L30656–30745

**Acceptance check:** From dashboard, curator reaches assigned review in <=2 deliberate actions.

### FQ-15 · Saturated KPI surfaces compete

**Priority:** P2 · **Area:** Dashboard · **Evidence:** S

**Finding:** Four bright KPI counters use strong red/green/amber/blue simultaneously.

**Required direction:** Quiet typography-led summary, using saturation primarily for action-critical exceptions.

**Trace:** Screenshot KPI row

**Acceptance check:** Urgency remains obvious without making all metrics look urgent.

### FQ-16 · Overview repeats status content

**Priority:** P2 · **Area:** Dashboard · **Evidence:** S

**Finding:** Counts are echoed between top masthead, KPI tiles, and Helios briefing.

**Required direction:** One authoritative summary and relevant drilldowns; avoid repeated blocks.

**Trace:** Screenshot top and centre

**Acceptance check:** Dashboard has no duplicate metric absent a purpose.

### FQ-17 · Greeting message displaces professional context

**Priority:** P2 · **Area:** Dashboard · **Evidence:** S

**Finding:** Late-work greeting and date occupy premium area while identity and assigned clinical task are less prominent.

**Required direction:** Show institutional/current workspace context first; optional greeting stays subtle.

**Trace:** Screenshot 'Trabajando tarde'; L6538–6555

**Acceptance check:** Opening screen presents user's next work item above generic greeting.

### FQ-18 · Completion labels risk clinical overinterpretation

**Priority:** P1 · **Area:** Data semantics · **Evidence:** S

**Finding:** 'COMPLETO', 'ETI RESPONSIVAS' and percentage bars could imply clinical validation even if they represent populated fields.

**Required direction:** Distinguish data completeness, evidence quality, curator validation and jurisdiction-specific eligibility.

**Trace:** Screenshot KPI row; L10887–10895

**Acceptance check:** Metric definitions accessible; incomplete vs unvalidated never conflated.

### FQ-19 · Nested scroll and fixed rail need dedicated testing

**Priority:** P2 · **Area:** Responsive · **Evidence:** S+C

**Finding:** Worklist appears independently scrollable while main content occupies viewport; code uses sidebar/main panels.

**Required direction:** Define scroll ownership, focus restoration and sticky boundaries for mobile/tablet/desktop.

**Trace:** Screenshot left rail; L6357, L6503, L6523

**Acceptance check:** Viewport zoom and touch scrolling do not trap users or conceal actions.

### FQ-20 · Overlays and panels need consistent focus management

**Priority:** P1 · **Area:** Interaction · **Evidence:** C

**Finding:** Helios, dashboard, genotype, exports and audit use heterogeneous modal / dynamically inserted panel implementations.

**Required direction:** Adopt dialog/drawer primitives with focus trap, Escape, return focus, scroll lock and predictable layering.

**Trace:** L6995, L8350, L30656, L34312

**Acceptance check:** Playwright tests cover nested overlays, keyboard and screen reader names.

### FQ-21 · 40,935-line application monolith

**Priority:** P0 · **Area:** Maintainability · **Evidence:** C

**Finding:** UI markup, CSS, domain algorithms, fetch calls and reports share index.html.

**Required direction:** Vue+TS migration via adapters and feature-by-feature parity, while retaining legacy reference.

**Trace:** index.html L1–40935; only two runtime files on baseline main

**Acceptance check:** Typecheck and tests pass before replacing any working path.

### FQ-22 · Shared mutable global state and registry

**Priority:** P1 · **Area:** State · **Evidence:** C

**Finding:** STATE, globals and public functions coordinate disparate workflows and can create cross-module side effects.

**Required direction:** Keep typed state by route/workspace and carefully scoped shared stores; remove direct mutation from components.

**Trace:** L7853, L10770–10840, L11434

**Acceptance check:** Selecting a variant does not unexpectedly reset unrelated workspace state.

### FQ-23 · Inline event handlers at scale

**Priority:** P1 · **Area:** Interaction · **Evidence:** C

**Finding:** Static scan identified ~416 inline on* handlers tightly coupling markup to globals.

**Required direction:** Migrate controls to Vue event binding/components; feature-specific event and focus tests.

**Trace:** L6105–6189; source-wide count

**Acceptance check:** No new inline handlers; migrated components pass keyboard tests.

### FQ-24 · Direct HTML string rendering has sanitization burden

**Priority:** P1 · **Area:** Rendering · **Evidence:** C+R

**Finding:** ~317 direct innerHTML assignments coexist with dynamic evidence/notes/report values.

**Required direction:** Move to escaped Vue templates; only constrained safe markup for reviewed rich content; audit untrusted sinks.

**Trace:** L7870; L8417; L38901–38930

**Acceptance check:** Injected test strings render as text; no executable HTML.

### FQ-25 · Styles are scattered across document and generated templates

**Priority:** P1 · **Area:** Styling · **Evidence:** C

**Finding:** The file embeds large CSS regions, inline styles and dynamically generated style tags.

**Required direction:** Create tokenized CSS foundations and scoped feature styles; retire CSS layers only with screenshot parity.

**Trace:** L64–5316, L7772–7784, L24669–25150

**Acceptance check:** Style tokens replace hard-coded primitive styling in migrated views.

### FQ-26 · Duplicate function declarations need resolution

**Priority:** P2 · **Area:** Maintainability · **Evidence:** C

**Finding:** Source has repeated names including exportAuditTrailCSV and toggleExportMenu; some others are nested helpers.

**Required direction:** Enumerate scope and call sites; explicitly select canonical implementation before extraction.

**Trace:** Source-wide declaration scan; functions at L8350 onward

**Acceptance check:** No accidental behavior changes; canonical names have tests.

### FQ-27 · Global fetch monkey-patch increases hidden coupling

**Priority:** P1 · **Area:** Network · **Evidence:** C

**Finding:** The application replaces window.fetch to alter abort behavior globally.

**Required direction:** Centralize requests through typed client with controlled retries and cancellation.

**Trace:** L8621–8650

**Acceptance check:** Timeout and cancellation cases pass without global overrides.

### FQ-28 · Cached views and persistent state lack clear ownership

**Priority:** P1 · **Area:** Offline behavior · **Evidence:** C+R

**Finding:** Local/session storage and offline-first variant loading coexist with server data and filters.

**Required direction:** Classify each cache as safe/ephemeral/sensitive; version invalidation and stale-data labels.

**Trace:** L33759; L10557–10596; L10770–10840

**Acceptance check:** Offline/read-only mode visually distinct and stale data cannot be mistaken for current.

### FQ-29 · Mixed bearer-session and anonymous-key writes

**Priority:** P0 · **Area:** Authorization · **Evidence:** C+R

**Finding:** Several read/write paths send public anonymous bearer, including audit/Helios/import, while AUTH provides session headers elsewhere.

**Required direction:** Inventory endpoints and enforce per-role grants/RLS or trusted server authorization; deny anonymous writes by tests.

**Trace:** L7945–7951, L9645, L10611–10618, L10709–10725, L21891

**Acceptance check:** Anonymous and insufficient-role writes fail at the server in staging.

### FQ-30 · Browser-visible PIN hash cannot secure writes

**Priority:** P0 · **Area:** Authorization · **Evidence:** C+R

**Finding:** Client-side PIN hash verifier is embedded in shipped HTML; UI write mode is not a trusted boundary.

**Required direction:** Use server-enforced credentials, claims and approval authorization; UI mode becomes presentation only.

**Trace:** L8541–8562, L10599–10605, L11200–11227

**Acceptance check:** Forging browser UI/local state never authorizes a write.

### FQ-31 · Role display and privileges may be conflated

**Priority:** P0 · **Area:** Authorization · **Evidence:** C+R

**Finding:** AUTH.role reads editable user_metadata.role and clinical/curator view is user-toggleable.

**Required direction:** Derive permissions only from trusted server claims/RLS; separate user-facing presentation mode.

**Trace:** L7963–7965, L8329–8345

**Acceptance check:** Role-change UI cannot elevate server privileges.

### FQ-32 · Helios claim fails open after RPC exception

**Priority:** P0 · **Area:** Concurrency · **Evidence:** C

**Finding:** heliosClaimItem catches RPC errors then returns true; a claim failure can allow approval flow to continue.

**Required direction:** Fail closed; require confirmed server lock/transaction before review mutation.

**Trace:** L31351–31371; L31595–31608

**Acceptance check:** Simulated RPC outage prevents approval and safely reports retry.

### FQ-33 · Urgent approve path lacks consistent safeguards

**Priority:** P0 · **Area:** Review governance · **Evidence:** C+R

**Finding:** Approve-with-note path prompts for a note yet does not check nonempty input and differs from standard AUTH.requireAuth / lock flow.

**Required direction:** One audited approval command requiring role, identity, reason when mandatory and conflict/lock check.

**Trace:** L31585–31642

**Acceptance check:** Empty urgent note rejected; unprivileged approval denied; lock enforced.

### FQ-34 · Helios approval state, data edit and audit are separate operations

**Priority:** P0 · **Area:** Data integrity · **Evidence:** C+R

**Finding:** Approval sets status, then applies proposed variant change, then writes an audit record; partial failure can produce inconsistent history.

**Required direction:** Server-side transactional approval with optimistic version guard and immutable audit event; idempotency keys.

**Trace:** L31608–31618, L31633–31641

**Acceptance check:** Injected failure rolls back or leaves explicit recoverable pending state.

### FQ-35 · Offline failed-write queue may persist sensitive payloads

**Priority:** P0 · **Area:** Data protection · **Evidence:** C+R

**Finding:** Serialized requests and queued replay use localStorage; replay may use anonymous Authorization and outlive auth session.

**Required direction:** Identify sensitive fields, disallow PHI in local caches, reauthorize and idempotently replay only approved operations.

**Trace:** L10556–10597

**Acceptance check:** Queued writes cannot replay after logout or privilege revocation.

### FQ-36 · Heuristic confidence can be mistaken for clinical probability

**Priority:** P0 · **Area:** Scientific interpretation · **Evidence:** C+R

**Finding:** Robotic proposals calculate additive evidence-presence points capped at 95; the UI calls them confidence.

**Required direction:** Explicitly present as evidence-availability heuristic; retain disclaimer in every relevant state and test calibration separately.

**Trace:** L9618–9641, L10206–10269

**Acceptance check:** No report/display describes lookup confidence as clinical validity.

### FQ-37 · CFTR2 proxy and federated evidence need explicit source provenance

**Priority:** P0 · **Area:** Scientific provenance · **Evidence:** C+R

**Finding:** fetchCFTR2Data uses local authority tables as proxy, while ClinVar can be fetched live; authority fields differ.

**Required direction:** Model direct API, curated proxy, literature and local annotation separately with source/version/date.

**Trace:** L13832–13915

**Acceptance check:** Reviewer can trace each assertion to authoritative source or curated proxy.

### FQ-38 · Genotype summary contains broad clinical predictions

**Priority:** P0 · **Area:** Clinical safety · **Evidence:** C+R

**Finding:** computeCompoundGenotype derives modulator eligibility, sweat chloride and pancreatic status from simplified class/ETI rules.

**Required direction:** Clinical safety review of intended use, jurisdiction and evidence; avoid unsupported definitive labels until validated.

**Trace:** L14063–14131

**Acceptance check:** Golden test cases, uncertainty states, clinician sign-off and provenance all pass.

### FQ-39 · Search analytics include geolocation pathways

**Priority:** P1 · **Area:** Privacy · **Evidence:** C+R

**Finding:** Browser geolocation and IP-location fallback are implemented alongside search intelligence and institution signals.

**Required direction:** Minimize collection, document purpose/lawful basis, consent where needed, retention and deidentification.

**Trace:** L13033–13110, L14957–15460

**Acceptance check:** Privacy tests prove no collection without documented policy/trigger.

### FQ-40 · No repository-local automated release gate

**Priority:** P0 · **Area:** Release governance · **Evidence:** C

**Finding:** Original main only has index.html/CNAME; no CI workflow or tests; main reported unprotected.

**Required direction:** Add branch protection and CI covering domain golden cases, E2E, authorization, accessibility and security scanning before application merges.

**Trace:** GitHub baseline tree, branches/main and rulesets (Phase 0 read-only inspection)

**Acceptance check:** Required checks are green before production-bound main merges.

## Sequencing and governance

1. **Before any new clinical writes or enterprise-security claims:** verify P0 authorization, lock, atomicity, offline data, provenance, genotype safety and clinical intended use. Unverified production controls remain an explicit blocker.
2. **Before replacing the existing interface:** preserve golden scientific fixtures; create deterministic search, curation, genotype, and export comparisons; verify isolated staging.
3. **Then improve shell and worklist:** fix hierarchy, typography, navigation, selection/focus and responsiveness without altering domain behavior.
4. **After the core journey is stable:** migrate Helios, curation, genotype, intelligence and reports with separate safety sign-off.
5. **Never use 'premium design', 'acquisition-ready', 'clinical validated' or a specific financial valuation as a certification claim.** Evidence and audited quality, not appearance, support buyer confidence.

## Scope boundary

This audit does not include an authenticated clinical session, external database inspection, source licensing review, user research, all mobile widths, network timing or production penetration testing. Screens other than the supplied overview are mapped from source, **not visually certified**. Preserve the existing production runtime until separately approved.

## Next deliverables

- [Functional & data flow inventory](../architecture/PHASE-0A-FUNCTIONAL-DATA-INVENTORY.md)
- [Phase 0A acceptance and next implementation gates](../plans/PHASE-0A-ACCEPTANCE-AND-NEXT-GATES.md)
- [ADR-0001](../architecture/ADR-0001-modular-frontend-and-backend.md)
