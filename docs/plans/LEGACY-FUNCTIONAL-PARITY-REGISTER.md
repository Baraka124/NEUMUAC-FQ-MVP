# NeumuacFQ — Legacy-to-modern functional parity register

**Owner requirement:** the Vue migration MUST preserve or explicitly retire every functional capability of frozen `index.1.html`; a modern module existing is not evidence of parity.
**Baseline:** Legacy application frozen at SHA `c18221fb6baf47782318ca3685b94b088c359a66`, with the source/function cross-reference in `docs/architecture/PHASE-0A-FUNCTIONAL-DATA-INVENTORY.md`.
**Date opened:** 2026-10-14. **State:** living backlog, not proof of functionality or clinical validation.

## Status contract

- **Partial** = usable subset exists, full original workflow or acceptance parity is outstanding.
- **Staged only** = isolated contract or draft; not wired to production services.
- **In progress** = change under development, not yet passed and deployed.
- **Not migrated** = no verified functioning modern equivalent.
- **Complete** must not be used without linked PR, passed tests, production acceptance and a scientific-review gate where relevant.

## Persistent capability map

| ID | Area | Original capability / destination | Status | Anchor or source | Acceptance criterion |
|---|---|---|---|---|---|
| NFQ-001 | Application & identity | Application boot and staff sign-in | Partial | Original AUTH and session handling; Vue sign-in | Session recovery, expired JWT, public anonymous path and logout independently verified |
| NFQ-002 | Application & identity | Institutional masthead and user context | Partial | Legacy masthead, curator/clinical/jurisdiction modes | Preserve context, responsive navigation and role-specific views |
| NFQ-003 | Variant search | Variant list, paging and class filter | Partial | Legacy variant worklist; Vue live reads | Sort, class, data status, treatment references and paging reconcile with database |
| NFQ-004 | Variant search | Nomenclature, HGVS and alias resolution | Partial | searchVariants, normalization, 52-case differential suite | Scientifically reviewed aliases, accurate ordering and negative controls |
| NFQ-005 | Variant search | Compound, positional and fuzzy search | Not migrated | Legacy search scoring and structured queries | Independent differential and ambiguity tests across real nonidentifying variants |
| NFQ-006 | Variant search | Search-miss feedback and queue | Not migrated | search_miss_queue, search logging | Bounded miss logging, privacy gates, triage and deduplicated queue |
| NFQ-007 | Variant detail | Scientific variant dossier | Partial | Legacy detail; Vue field projection | Provenance, class, status, external authorities and completeness visible |
| NFQ-008 | Variant detail | Nomenclature correction and history | Not migrated | Legacy editing and corrections | Approval, immutable before/after and rollback permission tests |
| NFQ-009 | Scientific evidence | Reference list and provenance | Partial | evidence_links; Vue live source register | Full evidence types, provenance and source-link reliability verified |
| NFQ-010 | Scientific evidence | Evidence scoring and confidence explanation | Not migrated | scoreEvidenceQuality / explanation | Versioned independent scientific rubric; no misleading probabilities |
| NFQ-011 | Scientific evidence | ClinVar live federation and conflict display | Not migrated | Legacy fetchClinVarData | Authority, refresh date, outage and conflicts verified |
| NFQ-012 | Scientific evidence | CFTR2 curated authority and reference context | Not migrated | Legacy CFTR2/proxy integration | Licensing/provenance and authoritative variant linking approved |
| NFQ-013 | Scientific evidence | Additional external scientific sources | Not migrated | NCBI, gnomAD, LOVD, trials and DOI links | Bounded connectors, rate-limits, source versions and safe fallbacks |
| NFQ-014 | Classification | CFTR functional-class rules and subtype | Partial | variants class fields, cftr_class_rules | Versioned class interpretation and negative controls validated |
| NFQ-015 | Classification | Modulator evidence ETI / Alyftrek | Not migrated | Legacy treatment context | Jurisdiction- and evidence-aware reference, no patient recommendations |
| NFQ-016 | Classification | Clinician versus curator scientific projections | Not migrated | Legacy clinical/curation modes | Field-level authorization and view parity assessed |
| NFQ-017 | Classification | Scientific nomenclature decision governance | Staged only | ADR-0003, differential exception register | Independent review approvals and versioned release gates |
| NFQ-018 | Curation | Contributor draft and evidence submission | Not migrated | Legacy edit/save; proposal records | Verified authorship, drafts, conflict-safe write and audit |
| NFQ-019 | Curation | Validation actions and reviewer attestations | Not migrated | Legacy validation_history | Server authorization, attributable review and rejection path |
| NFQ-020 | Curation | Inter-rater contradictions and conflict handling | Not migrated | Legacy checkInterRaterConflict / contradictions | Concurrent disagreement, resolution and audit replay tested |
| NFQ-021 | Curation | Variant chronology and immutable audit history | Not migrated | Legacy showAuditTrail | Readable history, provenance and tamper-resistant server log |
| NFQ-022 | Helios | Helios review inbox and claim/release | Staged only | Legacy openHelios, helios_claim/release | Atomic ownership, lease/timeout and concurrency gates |
| NFQ-023 | Helios | Helios approval/reject and trace | Staged only | Legacy approve and audit flows | Human decision, conflict resolution and transactional audit tests |
| NFQ-024 | Genotype | Two-variant exploratory comparison | Partial | Legacy compound genotype; Vue pair workspace | Nomenclature/evidence comparison, saved stable URL and coverage |
| NFQ-025 | Genotype | Allelic phase and genotype interpretation | Not migrated | Legacy computeCompoundGenotype | Intended use approval, uncertainty and data source verification |
| NFQ-026 | Genotype | Jurisdiction-aware drug reference context | Not migrated | Legacy therapy and geography logic | Documented authority dates, regulatory differences, no unsupported advice |
| NFQ-027 | Intelligence | Source-link coverage and gaps | Partial | Vue live coverage; legacy dashboard | Coverage reconciles, classification/data completeness and action priority |
| NFQ-028 | Intelligence | Search trends and analytics reconciliation | Not migrated | trending_variants_weekly, search_history_log | Privacy-safe trends, denominator and reconciliation tests |
| NFQ-029 | Intelligence | Curation priority and triage queue | Not migrated | curation_priority_queue, research_gaps | Explainable priorities; separate missing data from scientific certainty |
| NFQ-030 | Intelligence | Institutional and geographical analytics | Not migrated | institutions, geo_search_enriched | Consent minimization, institutional privacy and metric provenance |
| NFQ-031 | Reporting | Individual variant research brief | In progress | Legacy exportClinicalReport; current phase 2M-R | Deterministic current live nomenclature, dossier and cited sources |
| NFQ-032 | Reporting | Scientific research dossier and printable/PDF report | Not migrated | Legacy generateElitePDF | Reproducible reference metadata and approved report template |
| NFQ-033 | Reporting | Research/ethics and IRB package export | Not migrated | Legacy export IRB | Authorized redacted, versioned and traceable package |
| NFQ-034 | Operations | Import/batch updates and schema validation | Not migrated | Legacy validation / batch import | Dry run, diff preview, independent approval and rollback |
| NFQ-035 | Operations | Offline queue and retry/replay | Not migrated | Legacy dbWrite and replay cache | Idempotent retries and no cached clinical identifiers |
| NFQ-036 | Operations | Researcher role provisioning and authorization | Staged only | 2026 role membership migration PR #40 | Production RLS, verified users and denied self-elevation tests |
| NFQ-037 | Operations | Background sync, watchers and alerts | Not migrated | scan-miss-queue and watch notifications | Server jobs, observability, opt-in notices and rate controls |
| NFQ-038 | Quality | Responsive UI, accessibility and collapsible lists | Partial | Modern Vue shell, PR #43 | Mobile/tablet/desktop, keyboard, reduced motion and no hidden controls |

## Non-negotiable migration practice

1. Every feature-development PR must cite one or more **NFQ-IDs**, update its status honestly, and preserve any dependent legacy capabilities. UI shells, staged SQL, and read-only browsing are never marked complete merely because they exist.
2. Every migrated scientific behavior requires matching old-system cases, a review of known discrepancies, live-data verification when possible, and visible source/version/uncertainty treatment.
3. Every authenticated write path requires server authorization, role attribution, conflict handling and an audit trail. Do not silently enable production write access.
4. Public pages must work without sign-in; the archived legacy entry remains a functional reference pending accepted replacement.
5. For long lists, use accessible progressive disclosure (explicit expand/collapse), sane paging and responsive containment, not nested hidden menus or unbounded card walls.
6. The CI parity safeguard enforces stable IDs and statuses so capabilities cannot disappear silently. A status change is evidence of progress only when its acceptance criterion passes.

## Next implementation sequence

- **2M-R:** deterministic real-data research brief export **NFQ-031** and continuity gate; no patient identifiers or clinical recommendations.
- **2M-S:** richer source provenance and scientific disagreement register **NFQ-009, NFQ-010, NFQ-020, NFQ-021**.
- **2M-T:** source-supported nomenclature/structured search parity **NFQ-004, NFQ-005**, resolving outstanding differential exceptions with review.
- **2M-U:** approved contributor submission and validation workflow **NFQ-018..023, NFQ-036** (requires deployed server-side authorization).
- **Later:** Helios, external federation, genotype interpretation, batch import, offline replay, trend analytics, ethics reporting, and background monitors remain explicit open requirements. None are dropped.

## Working rules

Treat original references as historical source evidence, not proof a remote endpoint is currently functional. Record test reports and actual live state per feature; do not confuse database-recorded labels with independently adjudicated clinical facts.
