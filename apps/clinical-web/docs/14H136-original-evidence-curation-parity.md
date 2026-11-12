# 14H136 — Original evidence/validation workflow → modular source curation

## Source of truth and preservation boundary

The owner-supplied original `index (85)(1).html` remains **unaltered**. The references below refer to that original source and are **functional inventory**, not unconditional endorsement of the original assertions or security model.

- **Evidence conflict graph:** original `_buildEvidenceContradictionGraph` and `_showEvidenceContradictionBadge` around **lines 12865–12958** used recorded `evidence_links`, criterion/sentiment relationships, and a path to Helios for curator follow-up. Its detections cannot be called validated scientific contradictions without inspecting provenance and source claims.
- **Validation modal / two-clinician checks:** original around **19527–19702** prompted for clinician identity, role and confidence; it rejected a second validation with the same name, but warned rather than blocked on same role. It queried prior field validations for potential disagreement. The original write-mode/PIN and local-state checks were client-side, **not sufficient as a modern authorization guarantee**. Their behavior must not be copied blindly.
- **Evidence scoring/proposals:** original `scoreEvidenceQuality`, `deriveClassificationProposal` and robotic proposal creation around **9050–9100**, **9200–9410**, and **9926–10005**. Title/metadata heuristics were proposals, not verified scientific conclusions. They are not silently applied to current records.

## Existing modular capability protected

The present V6 already provides:
- `liveEvidence.ts`: restricted read-only, variant-scoped and paginated evidence links; no silent truncated full view.
- `Evidence.vue`: source identifiers, DOI/PMID vs linked URL consistency, optional PubMed publication-type lookup, page CSV export and research proposal drafting.
- `EvidenceProposalDraft.vue`: optional controlled, authenticated *proposals* for publication-source corrections; published records are unchanged without separate review.
- `liveResearchHistory.ts`: read-only, limited, nonidentifying validation events and recorded conflicts; its projections explicitly exclude names, institutions and free text. **Independent two-person review cannot be verified from these public projections.**

## New additive module

`src/domain/evidenceCurationPage.ts` builds a deterministic review worklist **solely from the currently fetched reference page**:
1. Recorded DOI/PMID vs linked-URL mismatch (existing `referenceLinkConsistency` used unchanged).
2. Same DOI or PMID repeated under distinct reference IDs **for the same variant on the visible page** (may be legitimate, not proof of duplication).
3. Missing DOI and PMID, publication year or publication type **as recorded metadata gaps** (not automatically a publication-quality problem).

Results are immutable, do **not** alter references, do **not** infer study design/therapy response and are clearly labeled *current page only*. UI is a restrained collapsible list; `Inspect reference #ID` opens and focuses the existing source record, retains its DOI/PMID check, source links, PubMed inspection, and scientific-correction draft. No new calls, roles or patient data.

Unit tests cover full vs incomplete catalogues, source-link disagreement, cross-variant duplicate isolation, immutable output and exact page scope. Connected phone browser tests cover inspecting a source, seeing its observation details, leaving the scope, no stale worklist and GET-only evidence calls.

## Explicit remaining functional parity gaps

**Not achieved by this PR:**
- Full cross-reference contradiction graph and expert review of direction, criteria, cyclical evidence or biological validity.
- Secure server-side independent-validator identity/role enforcement, verified institutional membership and transactional curation decision audit.
- Historical curator queue, impact/confidence breakdown and automated PubMed/ClinVar proposals.
- Scientific study-quality appraisal or current regulatory approval check.

These should be separately scoped with clinical leadership, access controls, and privacy/data governance before allowing record-affecting actions. This release is **additive**, not a replacement or simplification.

**Acceptance gate:** CI build/typecheck/unit, five-therapy contract, browser smoke, parity/legacy integrity; no original HTML, DB, existing scientific outcomes, Supabase configuration, neumDESK, or production release controls changed.
