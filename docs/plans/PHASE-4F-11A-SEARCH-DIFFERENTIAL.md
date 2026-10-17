# Phase 4F-11A — Original-to-Vue scientific search differential baseline

**Evidence:** Direct inspection of original frozen `index.1.html` Git blob `c18221fb6baf47782318ca3685b94b088c359a66`, primarily `searchVariants` near L12785. Compared with Vue `src/domain/compoundDiscovery.ts`, its tests and `src/services/liveVariants.ts`. This document records **observed source behavior**, not validated scientific synonym equivalence or executed live-database parity.

| Behavior | Original source | Vue current | Phase action |
|---|---|---|---|
| Exact recorded identifiers | Search list and multiple matching paths | Exact-name candidate resolution and recorded identity lookup | **Preserve** immediate unambiguous resolution; confirm deployed acceptance |
| Aliases | Original name/normalization routes | Text search in `alt_names`; exact query candidate restrictions differ | **Audit** exact alias semantics against schema before changing |
| Informal/eponymic terms | `normaliseQueryWithSteps` can rewrite name/position, then recurse | No unverified semantic rewrite | **Investigate** mapping provenance and non-equivalent names; never guess |
| Single positional number (`508`) | Early positional resolution possible | Treated as textual identifier | **Investigate** recorded reference coordinates/transcript and ambiguity first |
| Compound terms separated by whitespace | `SEARCH_GATE.detectCompound` can process and merge parts with hit/miss breakdown | Explicit comma/semicolon OR searches; whitespace remains one literal term | **Candidate for 11C**, preserving uncertainty and no allelic phase inference |
| Explicit comma/semicolon OR | Original compound handling and per-part logging | 1–4 terms through `parseDiscoveryTerms` + PostgREST expression | **Preserve**; bounded, read-only, verify partial-result UX |
| Legacy slash name `1001+11C/T` | Historical catalog nomenclature | Narrow literal slash allowance | **Preserve**, do not infer HGVS `C>T` equivalence |
| Uncertain HGVS and phased alleles | Original complex pathways | Strictly blocked until separately interpretable | **Preserve safety gate** before allowing any enhancements |
| Query tracking | Legacy hit/miss logging with part-wise calls | Current read-only public discovery; no equivalent logged patient/location metadata | **Do not restore** automatically; privacy-governance phase applies |
| Evidence of result identity | Original uses merged record IDs | Vue decoded positive canonical variant IDs and cautious exact candidate resolution | **Preserve and reinforce** records-first identity, no guessed synonyms |

## Phase acceptance path

**11A (this change):** source-to-source comparison and regression snapshots for known modern search boundaries; no change to discovery behavior or production data.

**11B:** identify specific legacy normalization mapping tables and their sources; propose provenance-aware aliases only where backed by a *recorded* variant identity. Provide match-reason labels where possible, while refusing ambiguous transcript or nickname mappings. Require evidence on exact data fields.

**11C:** specify explainable multi-identifier search with separated per-term status (matched / not found / ambiguous), intentionally distinct from genotype or phased haplotype. Test mixed-hit and duplicate cases.

**11D:** test exact `1001+11C/T`, positional and multi-term cases against real authorized records; validate desktop/mobile and historical behavior differential. Preserve no-fake-data and no automatic clinical inference.

## Research interface criteria

Keep calm light institutional styling; search should remain primary, exact-match selection immediate, controls compact; display why a result matched without duplicative headings or long explanatory cards. Put limits and nomenclature context in accessible `i` disclosures. No uncontrolled external or write requests, no unsafe normalization and no silent truncation.

**Status:** NFQ-003–006 remain Partial/Unmigrated per the parity register until executed acceptance proves otherwise. These tests characterize the existing implementation; they do not claim to reproduce original eponymic or positional mapping.
