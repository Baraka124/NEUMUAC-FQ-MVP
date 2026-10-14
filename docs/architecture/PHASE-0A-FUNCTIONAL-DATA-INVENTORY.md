# Phase 0A — Functional and Data-Flow Inventory

**Source:** `main` application `index.html`, blob SHA `c18221fb6baf47782318ca3685b94b088c359a66`. **Date:** 2026-10-14. Read-only static inspection; no live Supabase schema or role/RLS access. `CNAME` refers to `fq.neumact.org`; reported Vercel auto-deployment from GitHub is accepted as the owner's operational information but was not independently verified.

## System topology observed

- Browser-rendered single HTML app: CSS regions, markup, global state and JavaScript; Supabase JS UMD client, `AUTH`, `STATE`, `CONFIG`, `window.NeumuacFQ` registry and many global callbacks.
- Source measurements: ~40,935 lines, ~2.4 MB; 14 literal `<style` openers in source text (includes HTML templates), 3 top-level/external script openers by initial scan, approximately 416 inline on* attributes, 318 `innerHTML` assignments, 121 fetch-token occurrences. These are maintenance indicators; static text matches are not a parser-based security audit.
- Routes are not conventional Vue/SPA URLs today. Workspaces depend on DOM visibility, imperative renderers and overlays. Actual back/forward behavior needs browser verification.
- Read/cache/write interactions are browser-to-Supabase REST/RPC/Edge Function plus third-party sources. Some calls use session JWT; others use anonymous credential from public configuration. Permissions are NOT verified.
- Scientific curation algorithms and UI markup are intermixed. Migration must preserve scientific outputs until separately approved.

## Core workflows and source anchors

| Workflow | Source entry / logic (approximately) | Main interactions | Migration contract |
|---|---|---|---|
| Application boot/auth | `CONFIG` L7898, `AUTH` L7923, `STATE` L10770 | Supabase Auth session, global initialization, login/write mode | Auth service, typed session state, server privileges separate from view mode |
| Masthead and institutional context | L6061–6350 | Search, locale, jurisdictions, clinical/curator, hospital, overflow | App shell, deliberate navigation, user and jurisdiction context |
| Variant worklist/search | L6357–6522; `searchVariants` L12785; `renderVariantList` L18963 | Query, classes, ETI filters, paging, sorting, miss log | Typed search index/query, URL state, test alias/normalization results |
| Home/coverage dashboard | L6523–6628; `showDashboard` L22268 | Coverage metrics, missing data, review priorities, briefing | Overview with explicit metric definitions and real work actions |
| Variant detail | `renderVariantDetail` L19916 | Scientific fields, clinical vs curator projection, editing | Typed variant summary/detail with provenance and stable layout |
| Data validation and nomenclature | `validateVariantSchema` L10913; normalization around L11610–12531 | Required fields, aliases, classes, controlled vocabulary, correction | Domain schemas + golden cases; no silent reclassification |
| Search logging/research gap intelligence | L12547–14832; `showDashboard` L22268; L29675–29807 | Plausibility gates, miss queue, trend, institution/search geography | Separate operational analytics from clinical quality claims |
| Scientific external evidence | robotic scan L9493; `fetchClinVarData` L13848; `fetchCFTR2Data` L13891 | PubMed/ClinVar, curated CFTR2 proxy, federated authority/conflicts | Source type/authority/date/provenance; retriable bounded connectors |
| Evidence scoring | `scoreEvidenceQuality` L9905; proposal L10398; explanation L10206 | Literature quality, class/ETI proposals, lookup confidence | Versioned pure functions, explainability, no probability mislabel |
| Curation and audit | `showAuditTrail` L8350; `checkInterRaterConflict` L20812; L20700–21000 | Validation, disagreements, history, imports and edits | Server authorization, immutable audit and conflict review |
| Helios review | `openHelios` L30656, lock L31351, approve L31585 | Claim/approve/reject, proposal writes, trace | Atomic verified lock+approval+audit; fail closed |
| Genotype | `computeCompoundGenotype` L14063; panel L34312; run L35122 | Two allele comparison and drug reference context | Clinical safety/intended-use review, jurisdiction/uncertainty states, test fixtures |
| Reporting/exports | `exportClinicalReport` L24224; `generateElitePDF` L24405; export IRB L38438 | Summary exports, evidence, research/ethics packages | Deterministic exports, sensitive-data handling and revision info |
| Persistence and offline | `dbWrite` L10599, replay L10569, cache L33759 | Browser REST, retry queue, offline-first | Strong auth boundaries, idempotency, no retained identifiable clinical data |

## Endpoint inventory — source-observed (not verified production schema)

**Core variant and evidence tables:** `variants`, `cftr_variants_archive`, `cftr_class_rules`, `cftr_class_enriched`, `variant_evidence`, `evidence_links`, `validation_history`, `variant_notes`, `contradictions`.

**Helios and approvals:** `helios_pending_review`, `helios_audit_log`, `helios_monitor_targets`; RPCs named `helios_claim`, `helios_release`, `resolve_contradiction`, `check_write_pin` where referenced.

**Search and intelligence:** `search_logs`, `search_miss_queue`, `search_history_log`, `search_analytics_weekly`, `trending_variants_weekly`, `curation_priority_queue`, `research_gaps`, `geo_search_enriched`, `institutions`, `journal_impacts`, `genotype_assessments`, `variant_watch_notifications`. Some are plausibly views or RPC outputs rather than stored tables.

**Background integration:** `/functions/v1/scan-miss-queue`; `rpc/fn_refresh_platform_snapshot`. Backend code for these endpoints is not committed in this repository.

**External sources and infrastructure mentioned by source:** PubMed/NCBI eUtils, ClinVar, gnomAD, CFTR2 site/curated local authority tables, LOVD, DOI links, ClinicalTrials.gov, mapping, CDN styles/libs and geolocation. An HTML text mention does not imply an active, functioning integration; endpoints may be conditional, linked out, subject to CORS or unavailable.

**Authorization:** endpoint-by-endpoint grants, RLS policies and backend source must be retrieved privately from the owner before establishing safe public-read/writer permissions.

## Data sensitivity and trust-boundary categories

| Data | Approximate source area | Policy question |
|---|---|---|
| Public variant reference / aliases | `variants`, nomenclature | Licensed source? validated classification? update cadence? |
| Evidence citations and conclusions | evidence links, classification | Verified source and review status, revision provenance |
| Clinician identifiers and validation events | `AUTH`, `validation_history`, Helios | Authenticated access, audit immutability, retention |
| Genotype assessments / possible patient context | `genotype_assessments` | Are records identifiable? are fields necessary? consent/data minimization |
| Search logs, location and institution | search_logs, geolocation helpers | Legitimate purpose, privacy notice, collection controls, retention |
| Cached and queued writes | localStorage/sessionStorage, failed-save queue | PHI exposure, logout clearing, session revocation and safe replay |
| Tokens, PIN digest, user metadata | config/auth/write-mode | Secure key classification, authoritative role and action checks |

## Recommended migration ownership

1. `packages/clinical-domain`: nomenclature, canonical IDs, classification algorithms, evidence/reference metadata, genotype interpretation (under clinical review).
2. `packages/api-contracts`: typed variant/evidence/approval/search DTOs, validation schemas, error and result contracts.
3. `apps/clinical-web/src/services`: Supabase adapter and explicit API gateways, role claims and server policy responsibilities.
4. `apps/clinical-web/src/workspaces`: Overview, Variant Worklist/Detail, Evidence & Curation, Helios, Genotype, Intelligence, Reports and Governance.
5. `apps/clinical-web/src/components`: reusable clinical typography, tables, searchable combobox, navigation, dialogs, provenance badges, chronology/timelines, pending/error/offline states.
6. Tests: scientific golden cases, permission deny matrix, mocked integration and browser E2E; visual snapshots at mobile/tablet/desktop.

## Parity inventory to freeze in Phase 1

- Search exact, case-insensitive aliases, HGVS, legacy/protein names, mixed-class and structured queries.
- Unknown/missing evidence vs validated vs high-confidence lookup score: distinct semantics.
- Variant statuses and history after edit/undo/import; validation conflict detection.
- Helios lock/concurrent reviewers, user roles, approved/rejected states and atomicity.
- Clinical/curator presentation and authorized write actions.
- Two-variant/genotype outcomes for approved, contradictory, unknown and cross-jurisdictional evidence.
- External-source outage behavior and provenance fallback.
- Search gaps, analytics reconciliation, exported reports and identifiers.
- Keyboard focus, history/back, responsive overflow, mobile single-column layouts.

## Evidence limitations and policy

This is a static source map, not an authenticated runtime test, scientific validation, external licensing review or database penetration test. No patient data or privileged credentials were accessed; backend schema, migrations, Edge Function code and database policies remain unverified. No changes to clinical behavior are authorized by this inventory.
