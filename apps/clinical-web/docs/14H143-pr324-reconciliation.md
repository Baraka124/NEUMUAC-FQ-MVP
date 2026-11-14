# 14H143 · Reconcile historical PR #324 with the accepted V7 UI

## Audited source

Historical PR [#324](https://github.com/Baraka124/NEUMUAC-FQ-MVP/pull/324)
(`phase-14h138a-search-theme-logo-fidelity`) was developed against an older
baseline. It cannot be merged cleanly after #325, #326 and #327 were
incorporated into `main`, and GitHub reports merge conflicts.

The proposed changes to scientific calculation, evidence identities, backend
services, user permissions and migrations are **none**. This is only a
visual-layout and styling reconciliation.

## Already superseded by accepted work

- Home search: #324 requested a 560px upper bound; merged #325 is **540px**.
  Preserve the more compact approved search.
- Desktop logo: #324 used a new 44px box and 1.09 scale. Merged #325 retains
  the actual owner's image and displays it more prominently inside the
  original brand slot. Do not regress to #324 positioning or transforms.
- Existing Daylight/Midnight panel work, scientific controls and browser tests
  from #325 and #327 stay intact.
- Phone-specific typography, compact navigation and variant-list scrolling
  from #327 remain unchanged.

## Material details recovered from #324

- **Evidence source search** was still bounded to 680px in the current page;
  limit that instrument to 560px on non-phone viewports.
- **Genotype search/suggestions** had a 470px input bound; reduce to 420px on
  non-phone viewports.
- **Coverage search** remains no broader than the existing compact 455px
  input, within a 560px filter row. Do not stretch this instrument.
- Complete *named* Midnight controls for the remaining light-background
  secondary elements: notation guidance, pagination, Evidence/Genotype/
  Coverage search inputs, quiet Clear/Refresh/source scope actions, coverage
  group selections and documentation metadata.
- Preserve the **16px** mobile search inputs, keyboard focus, recorded CFTR
  class/therapy status colors and fully transparent compact actions.

## Verification / close-out

Run the existing clinical unit/build, source curation, Chromium browser,
five-therapy contract, legacy integrity, functional-parity and non-deployment
checks. Additional Playwright assertions test the recovered widths and
Midnight state at multiple viewport sizes.

The source PR's changes are ported selectively onto the already merged
baseline, not merged as a conflicting historical snapshot. Once the
reconciliation PR passes and merges into `main`, close #324 as **superseded**,
not as merged, with a traceable reference to the replacement.

This work does **not** deploy or publish clinical data; it does not modify
neumDESK, Supabase, authentication, research evidence or permissions.
