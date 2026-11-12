# 14H137C4 · Responsive expanded scientific workspaces

## Preservation and visual authority

The owner-provided original monolithic `index (85)(1).html` remains **untouched**, retained as the functional and aesthetic historical reference. This phase builds on the modular original-electric-blue/light/midnight styles merged in 14H137A–C3. The original contained real scientific source details and comfortable, quiet buttons; **nothing is intentionally simplified or suppressed**.

C4 targets the next genuine visual regressions in existing Vue components rather than piling on another application-wide override.

## Concrete component corrections

| Existing workspace | Root observation | Additive change |
| --- | --- | --- |
| Genotype `Genotype.vue` | At 1020px and below, toolbar actions reserved a full-width row and some controls were narrow touch targets | Intrinsic-width, wrapping, non-filled Copy comparison and Download actions; preserve 40px hit area and focus, independent of evidence readiness |
| Original five-regimen comparison `PairModulatorReview.vue` | Long historical rule explanations/descriptor values could compete with a fixed three-column row on phones | Minimum-width-zero text, wrapped historical description/value pairs, compact 40px Details/Edit/retry actions and responsive two-column rule layout |
| Evidence register `Evidence.vue` | On mobile, source links were forced to 100% width like prominent CTA slabs; metadata fields competed for line width | Intrinsic-width, wrapped source and return links with at least 40px height; compact source search and identifier detail layout with real DOI/PMID/source text preserved |
| Helios `Helios.vue` | The read-only navigation occupied an unnecessarily broad side column, with visually heavy selected tabs | Narrower desktop navigation (210px max), two-column responsive mobile area selection and quiet blue 40px step buttons; **all four workspaces and three examination steps remain visible** |
| Administration `Administration.vue` | Directory Clear/Refresh were 22px/28px controls; editor close was 28px, risking poor touch/focus discoverability | Proper 40px transparent touch targets, 440px bounded directory search and min-width protection for long identity strings; **no modification of role forms, assignments, reviews or authority** |

No new API requests, no new library dependencies, no new database or authorization actions.

## Scientific and operational invariants

- The five-modulator research comparison, recorded ETI and Alyftrek responses, exceptional Class I cases, original authority catalog and historical paired-genotype context are **unchanged**.
- Both recorded research source metadata and independently versioned source comparisons retain their exact meaning. Rule matches are not clinical eligibility.
- Helios remains read-only: do not add approve/reject/claim buttons or infer reviewer permissions.
- Administration's invitation, role editor and professional profile remain subject to existing verified-role and server permission gates; no invitations sent or roles assigned.
- Light/default and optional midnight themes remain available. No global color inversion or modification of CFTR scientific color semantics.

## Tests and acceptance

- General clinical browser tests exercise genotype toolbar controls, all four Helios areas and three steps, scientific read-only state, public-account non-escalation, and full-page containment at **320, 390, 768 and 1366px**, plus mobile midnight review navigation.
- Connected browser tests inspect every five-regimen row, expanded original-pair research facts and ETI historical authority audit, source mismatch details, complete source and variant return links, and full navigation back to the five-modulator dossier.
- All TypeScript, Vue browser, connected therapy, functional parity, legacy integrity and non-deployment gate workflows must pass before merging.

**Explicitly not yet established:** production website appearance, all authorized-account administration screens in real browsers, and manual visual comparison of every popover/scroll state. These require independent deployed-site verification; CI alone is not a complete visual acceptance test.
