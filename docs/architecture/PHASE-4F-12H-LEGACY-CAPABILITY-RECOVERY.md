# Phase 4F-12H — Frozen original capability recovery audit

**2026-10-18 · Audit only · No API, UI or database mutations.**

## Evidence and method

- Original application: frozen `index.1.html`, blob `c18221fb6baf47782318ca3685b94b088c359a66`. Function-name and line-anchor inspection of the actual source (not proof that historical runtime or third-party endpoints currently work).
- Modern application: `apps/clinical-web/src/router.ts`, `src/domain/researchWorkspaces.ts`, and Phase 12A–12G Helios Vue/read-contract development. Review contracts and shell are **not full legacy functionality**.
- Existing register: `docs/plans/LEGACY-FUNCTIONAL-PARITY-REGISTER.md`, NFQ-001 through NFQ-038. This supplements, not replaces, that register.

## Helios capabilities requiring explicit preservation or retirement decisions

| Legacy capability | Frozen source anchors (approximate line numbers) | Modern parity assessment | Safety/implementation gate |
|---|---|---|---|
| Inbox loading, filtering, priority, deferred re-opening, superseded items | 30784, 30869, 30811, 30845 | **Not functional in Vue**; queue shell only | Read and write separated; authorized atomic state transitions |
| Item expand and clinical identity | 31160, 31169 | **Not migrated** | Accessible disclosure, authenticated server actor identity |
| Claim/release and lease coordination | 31351, 31374 | **Not migrated** | Atomic ownership, expiry and concurrency |
| Discussion notes and polling | 30731, 30748, 30777, 31950 | **Not migrated** | Authorized comment writes, rate limits, no data leakage |
| Approval with note, rejection, defer, exceptional classification, bulk routine decisions | 31585, 31622, 31644, 31665, 31699, 31972 | **Not migrated** | Independent reviewer; no unsafe bulk or automatic variant edits |
| Search miss to review and creation of missing variant | 31732, 32971, 33061 | **Not migrated** | Source verification, dedupe, no fabricated entries |
| Evidence contradiction and drift detection | 31757, 31897 | **Not migrated** | Scientifically reviewed rules, provenance and uncertainty |
| Per-source feedback, approval-rate calibration and suppression | 31448–31515, 30584 | **Not migrated** | Do not confuse historic confidence labels with validated reliability |
| Internal, external, single-variant, Alyftrek, PubMed and geographic signal scans | 32236, 32722, 32821, 32894, 32926, 33617 | **Not migrated** | Versioned scientific inputs, licensing, bounded calls, human review |
| Source toggles, scan history, runtime console, progress and bot status | 32154, 32212, 32218, 32229, 33444, 33456 | **Not migrated** | Operational metadata separate from scientific claim |
| Monitor targets, ambient and scheduled scans | 33253, 33275, 33289, 33511, 34065, 34104, 34115 | **Not migrated** | Server jobs, opt-in, privacy safeguards and observability |
| Health check and validation queue | 33139, 33523 | **Not migrated** | Separate service health from evidence validation |
| Audit writing and audit review | 32093, 33407, 33298 | **Not migrated** | Server-only actor attribution, append-only audit, redaction |
| Scientific confidence detail and calibration | 30584, 33352 | **Not migrated** | Explanation, evidence provenance and no unvalidated precision |

**Core finding:** Phase 12A–12G recover interaction architecture and strict frontend boundaries, not Helios's original functional breadth. Public/anonymous Helios access is currently a security blocker (Phase 11J–11L), not a reason to drop these capabilities.

## Other distinctive original capabilities at risk

| Original function and source line | Recovery target | Parity warning |
|---|---|---|
| `showAuditTrail` 8350, `exportAuditTrailCSV` 8443 / 33298 | Attributed scientific chronology and governed export | NFQ-021 partial; export must be authorized |
| `renderCFTRClassDiagram` 9246, `showCFTRClassDiagram` 9353 | Research-grade functional-class visual explanation | Verify rule versions and do not imply biological proof |
| `renderConfidenceBreakdown` 10206 | Source-specific explanation of historical scoring | NFQ-010 not migrated; preserve concept, not unjustified numbers |
| `computeKnowledgeGapRadar` 13663, `computeVariantReachForecast` 13728 | Research gap and reach analysis | Transparent assumptions and denominator; don't market as validated forecasts |
| `renderVariantTimeline` 14315, `generateVariantQR` 14433 | Provenance chronology, precise shareable research reference | No sensitive state encoded in QR |
| `openBatchLookup` 14526, `openNomenclatureAudit` 23318 | Large worklists and formal nomenclature review | Bulk work guarded and diff-previewed |
| `toggleBookmark` 14835, `exportBookmarkedVariants` 23305 | Researcher saved worklists / portable export | Avoid saving PHI or hidden identifiers |
| `checkInterRaterConflict` 20812, `showDisputeModal` 38227 | Independent contradictions and dispute workflow | Auditable and reviewer-attributed |
| `openGapWorklist` 25257, `renderPriorityQueue` 27482, `renderGapQueue` 27564 | Prioritized research gaps with explainable criteria | Differentiate missing data from medical evidence |
| `renderCommandCentre` 27615, `renderCmdResults` 28827 | Fast contextual researcher command/navigation | Reconcile with calm Ctrl+K workspace switcher |
| `generateMDTReport` 36009, `exportIRBPackage` 38438 | Governed scientific/ethics reporting | No clinical recommendations without validated intended use |
| `openClassificationWizard` 38717 | Structured classification assistance | Scientific decision, approvals and rule version gates |
| `exportFilteredCohort` 38365 | Cohort/research subset export | Consent, de-identification and authorization required |

## Recommended recovery architecture — *without a crowded UI*

1. Keep existing calm **Variants / Evidence / Helios / Genotype / Research coverage / Geography** workspaces. Avoid one top-level menu item for every legacy function.
2. Under Helios: **Review** (claim, triage, discuss, decision), **Signals** (source scans, drift, contradictions, monitoring), **History** (audit, feedback, validation). Show context using discreet info disclosures.
3. Recover original scientific utilities in their natural workspaces: bookmarks and QR in Variants; transparent gap priorities in Research coverage; evidence scoring explanations in Evidence; governed reporting in export.
4. Give each capability its own NFQ acceptance and actual integration tests. Preserve frozen source semantics as comparison input, not automatic clinical truth.
5. Prioritize *security first*: no raw Helios DB reads, reviewer writes, scan triggers, or migration SQL until authorized grants/RLS and audited actor identity are verified.

## Suggested next steps

- **12I:** expand the existing 38-item parity register with Helios sub-capability checklists and distinctive utilities (no false Complete statuses).
- **12J:** implement the visual information architecture for Signals and History only where evidence of existing functions warrants it.
- **Later:** secure server adapters with explicit owner review; verification against original source/dataset; staged scientific and UX acceptance.
