# Phase 4F-10L — Source-verified legacy workflow reconciliation

## Source and scope

Read-only analysis of the frozen original `index.1.html`, Git blob `c18221fb6baf47782318ca3685b94b088c359a66` (about 40,935 lines, 2.4 MB). Source locations below refer to the archived unmodified file. This analysis documents implemented legacy logic; it **does not** prove that the original backend or external providers still function, nor does it endorse scientific conclusions.

The goal is to distinguish safely transferable research functionality from behavior requiring scientific, privacy or authorization review.

| Capability | Original source entry | Directly verified original behavior | Modern migration implication | NFQ IDs |
|---|---|---|---|---|
| Discovery | `searchVariants` around L12785 | Eponymic/positional normalization before structural gate; compound terms yield deduplicated result sets and part-wise hit/miss states | Characterize inputs and match identity against the differential suite before enabling broader approximate matches. Never invent equivalences. | 004, 005, 006 |
| Variant view | `renderVariantDetail` around L19916 | Switches between clinical/curator presentation, scrolls the selected dossier to top and updates comparison context | Preserve stable selected record, dossier hierarchy, responsive focus and only authorized actions | 002, 007, 016, 038 |
| ClinVar | `fetchClinVarData` around L13848 | Name-based NCBI ESearch followed by ESummary of the first result, with rate-gap heuristic | Avoid unsafe first-hit linkage; use verified recorded authority IDs, explicit failure states and independent source dates | 011, 013 |
| CFTR2 proxy | `fetchCFTR2Data` around L13891 | Uses local `ETI_AUTHORITY` lists; not a live CFTR2 API | Linked reference browsing can be preserved; treatment-response inference requires independent review and regulatory provenance | 012, 015, 026 |
| Evidence scoring | `scoreEvidenceQuality` around L9917 | Composite heuristics use journal impact, recency and study-design tiers; absent PubMed study types can fall back to title/abstract patterns | Treat historical numeric scores as recorded values, not validated quality or probabilities. Define independent review rubric first. | 009, 010 |
| Review | `checkInterRaterConflict` around L20812 | Checks existing validation history for disagreement with a proposed new value | Requires server-enforced permissions, attributable audit, concurrent-update protection | 018–021 |
| Helios | `openHelios` around L30656 and claim/approve routines in original inventory | Active review overlay/inbox and claim/release actions | Treat as workflow requiring atomic ownership and approval checks; not cosmetic migration | 022, 023, 036 |
| Genotype | `computeCompoundGenotype` around L14063 | Two-variant rules generate eligibility/severity/sweat-chloride narratives from labels and proxy lists | Preserve exploratory comparison, but do not carry medical recommendations or inferred eligibility without clinical/regulatory validation | 024–026 |
| Reports | `exportClinicalReport` around L24224; `generateElitePDF` around L24405 | Identity modal, selected/batch report path and PDF incorporating optional case context | Non-patient research exports can be reproducible; patient-linked fields require separate governance and redaction review | 031–033 |
| Audit | `showAuditTrail` around L8350 | Opens rendered validation/audit record interface | Validate immutable source, authorization and timestamps before claiming parity | 020, 021 |
  
## Design principles preserved

Maintain light, calm institutional visual language; data-first hierarchy; no redundant headings or ornamental cards; contextual details and limitations in accessible `i` disclosures; proportionate search fields and login panel; real controls and progressive disclosure; no jarring page jumps or oversized scrollable walls. Original legacy dark styling and imperative overlays are not design requirements.

## Implementation order (requires independent acceptance)

1. Scientific search differential cases: test original input normalization, ambiguity and positional/compound discovery against modern behavior; preserve recorded identity, not heuristic clinical equivalence.
2. Provenance-first reference navigation: source type, recorded identity, fetched timestamp, external failure/empty distinction and citation completeness, without endorsing source claims.
3. Controlled research submissions and review only after verified server-side authorization, RLS, concurrent claims and immutable audit design.
4. Genotype and clinical-report migration only after scientific intended-use and privacy review. Keep present non-clinical exploratory comparison.
5. Historical analytics and geographical reporting only using privacy-safe aggregation and approved retention rules.

All 38 NFQ statuses remain unchanged. Routine CI is necessary but not evidence of deployed data acceptance or clinical validation. No source data or production permissions were altered in this phase.
