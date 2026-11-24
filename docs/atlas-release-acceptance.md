# Geographic atlas — release candidate acceptance

## Scope
World and Spain boundary navigation, cohort allele observations via Ensembl, historical regional research searches via existing authenticated RPC, publication affiliations via OpenAlex. These are distinct evidence layers. No patient geography, national allele frequency, automatic DOI-to-variant association or global search tracking is supplied.

## Acceptance gates (not a claim of completion)
- All five GitHub workflows pass for the final candidate SHA.
- Check world and Spanish atlas navigation at desktop and mobile widths; keyboard picker, zoom, pan, deep links and return to variant.
- Verify live Ensembl exact rsID retrieval with a recorded CFTR alias; compare returned allele counts and frequencies to the source.
- Verify OpenAlex DOI lookup against a published work; confirm country names, resolved institution deduplication, map colouring, and reset on query/layer changes. If source authentication or CORS blocks requests, keep release blocked until resolved.
- Verify restricted, unavailable and empty states independently. Confirm existing regional RPC authorization and 20-event / 10-session suppression with authorized test accounts; never expose raw search records.
- Confirm public/guest/researcher/admin permissions and clinical five-therapy regression.
- Verify deployment SHA, legacy preservation, production smoke checks and rollback procedure.
- Obtain clinical owner acceptance before declaring controlled beta frozen.

## Rollback
Pre-atlas baseline: 2009ce0ba04a68b818e2c512e6b2f17e57d8e2e3.
Pre-GEO06 baseline: the accepted GEO04–05 merge on main. Revert candidate commits through review and redeploy a previously verified artifact; do not reset shared history.

## Status
Candidate documentation only. CI, live external endpoints, authenticated RPC and production acceptance must be recorded against the final commit. No release tag or deployment is implied by this document.
