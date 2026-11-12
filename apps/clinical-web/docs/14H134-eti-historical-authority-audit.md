# 14H134 — Original ETI authority reconciliation (historical, read-only)

## Historical artifact and strict provenance

The project owner supplied **index (85)(1).html**; this file remains outside the repository, unchanged. The original `ETI_AUTHORITY` is at lines **9504–9658**, and its ETI named-list tier inside `MODULATOR_MAP` is at lines **36862–36897**.

- Original `fda_trikafta_approved` contains **59 literal aliases**. The original array mixes US, EU, clinical and possible complex-allele claims despite its label. **This is a historical list, not a verified FDA label.**
- Original `fda_non_responsive` contains **15 literal aliases**. Non-response claims cannot be inferred from Class I status alone or used to reclassify exceptional cases.
- Original `resolveETIPrediction` ranks named positive names before named nonresponse, then broad class rules, then a weak literature signal, and finally insufficient evidence (lines **9598–9660**). These are historical display heuristics and must **not** be substituted for the independently recorded `eti_prediction` and its provenance.
- The original paired-allele `MODULATOR_MAP` uses a separate three-tier rule: names → direct evidence tier → Class II class-rule tier (36862–36885). Keep this independent of the original single-variant authority resolver.

## Current external verification boundary (12 Nov 2026)

The US FDA orphan approval record reports a **27 March 2026** expanded Trikafta indication. Official record: https://www.accessdata.fda.gov/scripts/opdlisting/oopd/detailedIndex.cfm?cfgridkey=647618. The official DailyMed prescribing information was updated **22 June 2026**: https://dailymed-us-east-1.awsprod.nlm.nih.gov/dailymed/drugInfo.cfm?setid=f354423a-85c2-41c3-a9db-0f3aee135d8d.

The EMA's Kaftrio EPAR product information was updated **19 August 2026**: https://www.ema.europa.eu/en/medicines/human/EPAR/kaftrio. EMA and FDA differ in their indication/interpretation and the original mixed list cannot be equated to either of them. None of these links certifies each legacy name; **formal per-variant, jurisdiction-, date- and product-specific reconciliation remains open**.

## Implementation / invariants

`src/domain/originalEtiAuthorityAudit.ts` preserves all **59 + 15 names** for *historical search and discrepancy review only*. It returns positive-name match, negative-name match, both or neither **without changing outcomes**. Case-insensitive exact recorded aliases are a usability enhancement relative to the original's mixed matching; no substring matching. A discrepancy between a historical name and a recorded response is surfaced as **review**, never resolved automatically.

The UI exposes a compact expandable historical audit *inside ETI details*, clearly separating it from the recorded rule tier. No drug dose or clinical advice is given.

Acceptance: full alias counts, misleading mixed-alias conflict, exceptional Class I response preservation, independent Alyftrek response, no inference from missing match, read-only domain behavior, and connected five-therapy/browser tests.

## Next phase

14H135 will reconcile original pair-level descriptors and edge cases. Do not merge historical names into the current candidate evaluator without clinical and jurisdictional signoff and executable source-level evidence.
