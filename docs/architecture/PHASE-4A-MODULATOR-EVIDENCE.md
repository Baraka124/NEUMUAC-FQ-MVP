# Phase 4A — CFTR modulator evidence architecture (NFQ-015, NFQ-026)

## Scope and current delivery

Phase 4A defines a **strict research-evidence data contract**. It does not enable a live treatment panel, create database objects, read clinical/patient records, perform modulator predictions, or imply clinician-approved treatment eligibility. It uses no invented scientific production records. Test-only metadata in source-controlled tests is not shown to users.

The legacy functional inventory describes ETI filtering and genotype drug context, but the authenticated backend schema and its drug-related source provenance remain **unverified**. A legacy HTML function name is not evidence of clinically accepted validity. Current Vue services expose variant records, local evidence links and classification metadata, but no verified modulator-response table or approved regulatory-indication bridge. Accordingly Phase 4A cannot be marked clinically complete.

## Evidence dimensions

| Dimension | Requirement |
|---|---|
| Modulator | Distinguish ETI, Alyftrek, ivacaftor-based combinations and an explicit OTHER category |
| Subject | Variant, defined genotype, or population; no undocumented alias mapping |
| Method | Regulatory document, clinical study, in-vitro study or curated literature |
| Finding | Reported response, reported nonresponse, mixed, inconclusive, not assessed or regulatory text only |
| Territory | EU, US, UK, OTHER or not applicable; in-vitro assays are not prescribing-jurisdiction decisions |
| Provenance | Authority, concrete document URL, publication/revision date, retrieval date, version and exact location |
| Review | Unreviewed, review pending or reviewed; never inferred from the fact that a link exists |

**Regulatory text is not synonymous with measured response or patient eligibility.** Kaftrio and Trikafta may share components but have independent EMA and FDA labels; Alyftrek is a separate formulation, with independently versioned source requirements. Reported laboratory effects, clinical outcomes and authority-approved indications must remain distinct. Functional class alone cannot determine efficacy, nor can one variant establish a patient's full genotype.

## Verified references for eventual ingestion

- [EMA Kaftrio EPAR](https://www.ema.europa.eu/en/medicines/human/EPAR/kaftrio)
- [EMA Alyftrek EPAR](https://www.ema.europa.eu/en/medicines/human/EPAR/alyftrek)
- [FDA Trikafta drug information](https://www.accessdata.fda.gov/drugsatfda_docs/label/)

These are **starting authorities to verify** before import, not an assertion that the latest indication text or date has been captured. Record the exact approved label PDF, version, date, territory, section and any rights before ingesting. Never create an ETI responder list from a class mapping or an outdated local flag.

## Required remaining gates before Phase 4B

1. Inventory the actual legacy drug/ETI UI and its specific backing fields, then review existing Supabase tables/views and RLS with an authorized account. Do not edit the frozen `index.1.html`.
2. Approve which validated, licensed source collections can populate each evidence method; establish precise variant/transcript matching and contradiction handling.
3. Review treatment- and genotype-related semantics with a CFTR clinician and an independent scientific reviewer, including Class I cases, missing evidence, conflicts and territory differences.
4. Implement a **GET-only**, RLS-constrained adapter for a verified source; distinguish empty from error/denied/unconfigured, and ensure no partial results are presented as complete.
5. Validate referential integrity, accessible citation links, freshness and automated negative controls; add a visible warning that the dataset is research evidence rather than a recommendation engine.
6. Change parity register status only when tests, real endpoint acceptance and scientific review have passed; NFQ-015 and NFQ-026 remain **Not migrated** until then.

## Safety and release

The first PR is strictly domain-code, unit tests and planning documentation, with no synthetic production fallback, no patient treatment decision flow, no new authenticated permissions and no Supabase writes. Visual integration is intentionally deferred.
