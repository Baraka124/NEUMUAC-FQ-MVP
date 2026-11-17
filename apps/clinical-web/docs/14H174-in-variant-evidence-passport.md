# Phase 14H174 — In-variant evidence verification passport

## Clinical research objective

Improve the original neumuacFQ variant dossier without replacing its
classifications, five-therapy calculator or independent scientific review
workflow. The original **Evaluate Mutation Evidence** 1716G/A example
motivates strict separation between variant identity, germline
pathogenicity, molecular-functional class, reported experimental response
and regulatory genotype eligibility.

**A database 'non-responsive' label is not experimentally verified
non-response unless supported by specific, independently reviewed source
observations.** Likewise, a lack of source claims in the accessible research
register does not prove that there are no relevant publications or that the
variant is biologically non-responsive.

The 1716G/A legacy notation must not be conflated with 1716+1G>A or a
similar-looking splice-site notation. This release uses recorded identifiers
only; it makes **no inferred synonym links** or automatic HGVS transformations.

## New in-dossier workflow

**Variant dossier → Response & evidence intelligence → Examine evidence →
Evidence verification passport → Verify evidence.**

A compact editorial, read-only research panel displays:

- The exact recorded legacy, cDNA, protein, aliases, subtype and functional
  class, with no generated annotations or guessed molecular mechanisms.
- **Independent ClinVar ESummary verification**, reused from the existing
  variant dossier. The NCBI service is invoked only on explicit user
  interaction with a supported recorded ClinVar Variation ID. The existing
  decoder requires matching Variation ID, VCV accession and CFTR gene
  identity; a failed request displays **verification unavailable**, not
  'no evidence'. Exact title matches to recorded protein/cDNA notations
  are treated as *nomenclature alignment candidates only*, never confirmed
  clinical equivalence. ClinVar germline classification and review status
  are presented separately from the database's protein class.
- Five original drug/regimen categories with **recorded response** in
  a separate column of scientific meaning from independently reviewed
  source observations. An archived flag or bibliographic link alone never
  becomes a reviewed response claim. Scope mismatches, contradictory
  reviewed sources and pending review are shown without recalculating drug
  response or eligibility.
- Variant-linked publication bibliography with source IDs, catalogued
  PMID/DOI, two-reviewer source-claim counts and citation identity flags.
  An explicit **Check PubMed indexing** action uses the existing
  ESummary reader only if the PubMed URL identity exactly matches the
  catalogued PMID. A mismatch or missing PMID disables the lookup rather
  than guessing an authoritative citation. Official title and publication
  types confirm *bibliographic identity only*, not whether that study
  demonstrates a particular CFTR drug response.
- A direct in-dossier scroll to the existing source claim proposal and
  independent-review controls, plus a link to the full source inventory.
  No separate search window or duplicated source-claim module.

## Security, source semantics and lifecycle

- The passport is embedded in the already **research membership-gated**
  `ResearchEvidenceIntelligence` panel. It uses the existing
  authenticated variant-scoped research snapshot and independently
  reviewed source claim RPC, not fabricated sample values.
- No new Supabase tables, RLS grants or privileged write paths. The
  existing ClinVar and PubMed fetchers make only explicit public official
  HTTPS requests, with no credentials, no caching and no background
  polling. Source indexing results are cleared on variant change,
  dismissal or component unmount.
- No class, source, drug record or review status is mutated by this UI.
  Corrections must use the separate established proposal + two
  independent scientific reviews process.
- External verification that fails or cannot establish identity must
  remain *unavailable*; it is **not** categorized as absence of evidence.
- ClinVar germline clinical significance, CFTR biochemical mechanism,
  drug-specific empirical responsiveness and prescribing label eligibility
  are not interchangeable; the passport explicitly keeps them separate.
- Neither the source register nor ClinVar/PubMed indexing is used to
  calculate individual treatment advice, effect size, predictive
  probability or patient eligibility.

## Acceptance tests

- Domain unit tests preserve Class II with recorded ETI/Alyftrek
  non-response when no independent study claims exist.
- Source disagreements are flagged and do not overwrite recorded
  therapeutic classes.
- Exact-nomenclature matching does not conflate c.1584G>A with
  c.1584+1G>A.
- ClinVar ID mismatch and failed external verification remain
  separate from the biological result.
- PubMed checks require source URL/catalogue PMID agreement and
  confirm **index metadata only**.
- Connected browser contracts cover verified researcher access,
  official PubMed ESummary, external failure and absent membership;
  all existing desktop/mobile, five-therapy, integrity and legacy
  regression checks must pass before merge.

## Next step — actual evidence validation

This phase establishes a trustworthy **comparison and verification
workspace**. Researchers must still inspect original CFTR clinical and
functional publications, confirm precise variant and genotype scope, and
submit source-specific experimental claims for two independent reviews.
A later approved workflow can propose class or therapeutic changes, but
it must not infer efficacy merely from a catalogue, gene name, label,
mechanism class or publication count.
