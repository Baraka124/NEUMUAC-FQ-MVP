# Phase 4F-12I — Detailed capability recovery and placement matrix

**Basis:** frozen legacy `index.1.html` and Phase 12H source audit. Status means **migration parity**, not whether old code once existed. None of these entries is declared complete. No production code, navigation, database, user roles or patient data changed.

## Placement policy — keep the sidebar selective

The sidebar should list a small number of **stable, distinct research destinations** (currently Overview, Variants, Evidence & Curation, Helios, Genotype, Research coverage, Geographic atlas). Do not append scanner types, review stages, history, bookmarks, imports, monitoring or exports as top-level destinations. Offer contextual actions in the relevant workspace; high-impact administration belongs behind authenticated administration/settings. Group advanced Helios functionality under Review / Signals / History, progressively disclosed and permission-aware. Do not create inert links to unavailable functions.

## Recoverable work packages

| ID | Legacy source anchor | Capability | Natural location | Current assessment | Proof required before claim of parity |
|---|---|---|---|---|---|
| H01 | 30784/30869 | Review inbox, filters, priority | Helios · Review | Shell only | Real authorized list, sorted and filter-tested |
| H02 | 30805/30845 | Deferred resurfacing and supersession | Helios · Review, contextual actions | Missing | Server-controlled idempotent state transitions and audit |
| H03 | 31351/31374 | Reviewer claim/release | Helios · Review | Missing | Race/lease/authorization test |
| H04 | 30731/30748/30777/31950 | Reviewer discussion and activity | Helios · Review detail | Missing | Append-only attributed note; bounded updates; role test |
| H05 | 31585–31699 | Approve, reject, defer, exceptional pathway | Helios · Review detail | Missing | Independent clinical decision, permissions, atomic log |
| H06 | 31972 | Routine bulk actions | Helios · Review, restricted bulk mode | Missing | Per-item preview, exact authorized scope, rollback |
| H07 | 32971/33061/31732 | Search misses and candidate creation | Helios · Signals / Variants search feedback | Missing | Privacy-preserving triage, dedup, never invent variants |
| H08 | 31757/31897 | Evidence contradictions / scientific drift | Helios · Signals | Missing | Versioned rules and reviewed scientific negative controls |
| H09 | 30584/31448–31515 | Feedback and confidence calibration | Helios · Signals; detailed methodology in contextual info | Missing | Denominators, source provenance, nonprobabilistic limits |
| H10 | 32236/32722/32821/32894/32926/33617 | Internal, external, PubMed, Alyftrek, geography and single-record scans | Helios · Signals | Missing | Licensed/rate-limited bounded read; human validation |
| H11 | 32154/32212/32218 | Scan history, source selection and diagnostic console | Helios · Signals / restricted Settings | Missing | Source health and last-run lineage, no noisy log dashboard |
| H12 | 33253/33275/33289/33511/34065/34104/34115 | Watch targets, ambient and scheduled scanning | Helios · Signals / Settings | Missing | Opt-in, schedulers, rate limit, privacy and observability |
| H13 | 33139/33523 | System health and validation worklist | Helios · History / Administration | Missing | Separate availability and scientific validation |
| H14 | 32093/33407/33298 | Review audit and exports | Helios · History | Missing | Tamper-resistant authoritative log and authorized exports |
| H15 | 32119/32147/33444/33456 | Review badge, scan status/progress | Helios · localized discreet status | Missing | Real-time provenance and reduced-motion accessibility |
| V01 | 9246/9353 | CFTR functional-class explanation diagrams | Variants · detail, expandable | Unverified parity | Reviewed class model/version and scientific caveat |
| V02 | 14315/14433 | Timeline and shareable variant QR | Variants · detail / contextual share | Unverified parity | Exact canonical identity, private-context exclusion |
| V03 | 14526/23318 | Batch lookup and nomenclature audit | Variants · tools; restricted audit in Administration | Unverified parity | Dry-run, validation, scientific governance |
| V04 | 14835/23305 | Bookmarks and exported research worklists | Variants · saved list | Unverified parity | Local privacy, exact record identity, no PHI |
| E01 | 10206/20812/38227 | Evidence confidence explanation, conflicts and disputes | Evidence · detail; Helios review where actionable | Unverified parity | Interpretability, adjudicated rubric and audit |
| I01 | 13663/13728/25257/27482/27564 | Gap radar, reach forecast and triage | Research coverage · progressive panels | Unverified parity | Transparent denominators and research-only status |
| I02 | 27615/28827 | Research command centre | Existing Ctrl+K launcher / in-workspace actions | Partial replacement, parity unproven | Tested task coverage without UI duplication |
| R01 | 8443/24224/24405/36009/38365/38438 | Audit CSV, research brief, MDT, cohort, ethics exports | Contextual export menus / authorized administration | Unverified parity | De-identification, approval, deterministic provenance |
| A01 | 21438/38717 | Batch import and classification wizard | Restricted Administration | Unverified parity | Dry-run and field-level authorization, rollback |
| A02 | 11092/11190 | Legacy PIN/write-mode interaction | Authentication/authorization governance only | Legacy behavior NOT to replicate as security | Real authenticated server roles and RLS replace client PIN |

## Priority and dependency

**P0 Security:** verify live environment, lock down anonymous write permissions and implement authenticated, accountable server decisions. Block H02–H06, H12–H14 and A01 until this is accepted.

**P1 Safe read-only recovery:** V01, V02, V04; H11 historic source metadata only if authorized; enhanced I01 explanations using genuine nonidentifying recorded data. Each requires a real-data acceptance check.

**P2 Review functionality:** H01–H05, H07, H14; server-backed review, idempotency and audit; provenance must be visible without adding a sidebar item.

**P3 Advanced signals:** H08–H13 and H15; prioritize source reliability, clinical rules and operators before visualization; no automatic scientific truth claims.

**P4 Sensitive exports and administrative tools:** R01, V03, A01; intended use and authorization signoff.

## Implementation and design acceptance

- One calm app shell; no repeated titles, duplicate navigation, full-width prose blocks or nested scroll containers. Long lists handle 10+ entries, responsive layouts and keyboard interactions.
- An advanced function may be reachable as contextual view, an information disclosure or settings action, **not automatically as a sidebar destination**.
- No synthetic production records; empty/loading/denied/partial/error states are distinct.
- Each recovery PR cites these work-package IDs and the matching NFQ IDs, original source anchors, owner-reviewed security/scientific gates, CI outcomes and actual deployed acceptance.
- Do not call Helios fully migrated until selected H01–H15 workflows meet their evidence requirements. Intentionally retired capabilities need written rationale and owner agreement.
