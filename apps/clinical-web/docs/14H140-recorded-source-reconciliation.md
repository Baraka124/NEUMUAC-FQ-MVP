# 14H140 · Recorded-source reconciliation in the evidence register

## Purpose

Continue V7 after 14H139 search/theme/brand acceptance. The original owner-provided
HTML remains untouched. Do not treat UI polish as permission to simplify the
original five-therapy science, exceptional Class I, ETI or Alyftrek logic.

This phase identifies **candidate source-record disagreements** among references
already loaded in the **same visible page and variant**. It is a research
metadata reconciliation workflow, not an automated scientific contradiction
graph, clinical inference, evidence quality appraisal or adjudication.

## Operational behavior

1. Group only same-variant references with an exactly matching normalized
   recorded DOI or PMID; relationships may be transitive across records
   sharing different identifiers. No match solely by title or scientific
   category and no comparisons across different variants.
2. Compare recorded DOI, PMID, title, year, journal, type and category.
   Distinguish **different nonempty recorded values** from a value **missing in
   some references**. Case-only and DOI-URL-notation differences do not create
   false discrepancies.
3. Show a quiet, collapsed-by-default **Cross-reference reconciliation** section
   with the matching identifiers and specific recorded values for each
   referenced ID. Reuse the existing source disclosure/focus routine.
4. Source details retain their DOI/PMID link assessment, original publication
   links, PubMed lookup, and **Prepare source correction** path. Existing
   reviewer/admin authorisation and independent proposal review remain
   separate; **no automatic submission, approval or publication**.
5. The results are recomputed only from each new loaded page. An empty,
   changed, unavailable or invalid page cannot expose stale comparisons.
   No additional network calls or database mutations were introduced.

## Evidence boundary and deferred work

This function only sees `LiveEvidenceReference` fields (title, identifiers,
recorded category/type/journal/year and values). It does **not** see the
study-level methods, measured effects, variant-claim criteria/sentiment or
full-text publications required to assert actual scientific contradictions.

A future cross-reference *claim* graph requires separately versioned claim
entities, high-quality provenance, clinician-defined criteria, independent
assessments and explicit governance. Do not disguise missing data with
heuristic scores or fabricated claim-level results.

The public read-only register cannot assert any global/cross-page completeness:
page size remains 10 and the existing source service contract is unchanged.

## Acceptance

- Pure domain tests: scope isolation, matching identifiers, transitive grouping,
  differences vs missing fields, immutable results and no fabricated clusters.
- Browser contracts: synthetic two-reference discrepancy, collapsed-by-default
  overview, recorded field comparison, focus into the correct reference and
  existing proposal path, route change clearing stale work, GET-only requests,
  and original Midnight appearance/phone containment.
- Existing Vue typecheck, domain tests, five-therapy browser contract,
  clinical smoke, functional parity and legacy integrity must stay green.

## Release boundaries

Stacked on draft PR #325 (`phase-14h139/search-theme-brand-continuity`).
No production merge or deployment, source publication, role grant, invitation,
Supabase schema/data change, neumDESK edit or original HTML modification.
