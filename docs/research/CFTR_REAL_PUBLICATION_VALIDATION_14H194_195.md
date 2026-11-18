# CFTR real-publication reference cases · phases 14H194–195

## Purpose and validity boundary

This suite anchors **bibliographic challenge cases** to genuine PubMed papers. It tests whether the neumuacFQ source register and comparison interface can preserve publication identity and study scope, and whether the pipeline refuses invented evidence or inferred clinical eligibility.

**It does not establish external scientific validation.** No source observation from these papers was inserted into the production research database, no expert panel has performed blinded double extraction here, and the software test claims are explicitly synthetic boundary fixtures.

The highest automatic status is `ready-for-expert-benchmark`: a reference is linked to a source-reviewed, correctly scoped claim and can be independently checked. It is not a scientific-accuracy certification.

## Source anchors verified 18 November 2026

| Case | Publication | Source-supported context | Explicit negative control |
| --- | --- | --- | --- |
| G551D / ivacaftor | Ramsey et al., NEJM 2011, PMID 22047557, DOI 10.1056/NEJMoa1105185 | Clinical trial enrolling people with a G551D allele; outcomes are trial-level findings | Do not assign an individual or isolated allele a treatment result |
| Phe508del/minimal function / ETI | Middleton et al., NEJM 2019, PMID 31697873, DOI 10.1056/NEJMoa1908639 | Randomized clinical trial for **Phe508del plus minimal-function** genotypes, not an unqualified single-variant assay | Do not assign clinical-trial outcomes to the minimal-function allele alone |
| NM_000492.4:c.1584G>A (1716G/A, p.Glu528=) | Bampi et al., Life 2020, PMID 33375403, DOI 10.3390/life11010014 | A source describes low-frequency splicing alterations in a complex synonymous-allele setting, including patient-derived experimental context | Do not infer ETI/Alyftrek response, general disease causality or an isolated Class II mechanism |

Source URLs:
- https://pubmed.ncbi.nlm.nih.gov/22047557/
- https://pubmed.ncbi.nlm.nih.gov/31697873/
- https://pubmed.ncbi.nlm.nih.gov/33375403/

The CFTR-France variant registry also lists `c.1584G>A` with legacy `1716G/A` (https://cftr.chu-montpellier.fr/cgi-bin/affiche.cgi?provenance=0&variant=c.1584G%3EA); its displayed disease-class label should not be silently substituted for functional experimental interpretation. This benchmark intentionally leaves classification disagreements for domain-expert assessment.

## Formal expert-validation protocol (not yet performed)

1. Independently confirm the paper's identity, its reported genotype, assay, outcome, comparator, timepoint, and study family.
2. Map the *exact* internal catalogue variant ID. Do not auto-generate identifiers from HGVS or alias names.
3. Have two independent domain experts extract and annotate publication statements, with figure/table/page locators and a reason for each uncertainty judgment. Keep disagreements and adjudication timestamps.
4. Contrast expert-reviewed reference statements with the platform's **live** approved source records and molecular interpretations. Require provenance, scope, cohort, model and endpoint compatibility.
5. Record case-by-case expected vs observed results, failure types, reviewer agreement and unresolved cases; report denominator and missing-data counts. Never interpret the absence of a record as evidence of absent biological function.
6. Repeat after changes to source normalization, therapeutic response logic, mechanism classes, and the clinical UI. Retain reproducible versions and a frozen bibliography.

### Acceptance criteria before claiming scientific validation

- All selected primary references are independently confirmed, correctly mapped and traceable.
- No fabricated or automatically approved source observations; independent reviewer and provenance checks pass.
- No mixing of G551D clinical genotype-cohort effects, Phe508del/minimal-function trial outcomes or c.1584G>A complex-allele mechanisms into unqualified variant-specific treatment effects.
- Expert-disagreed or absent observations remain explicitly unresolved.
- Documented per-case comparisons, adjudication records and blinded expert sign-off exist. These **have not yet been collected**.

## Automated regression scope

`publishedCftrReferenceCases.test.ts` uses **synthetic software fixtures** containing authentic PMID/DOI strings. These fixtures exercise boundary logic, not publication effect-estimate accuracy. The case registry is research-only and cannot create claims, approvals, patient records or treatment recommendations.

The newly visible research workspace has a small disclosure control for these cases rather than a permanent large dashboard.
