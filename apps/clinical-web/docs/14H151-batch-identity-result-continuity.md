# Phase 14H151 — Canonical batch identities and progressive result review

## Baseline and scope

Build directly on accepted 14H150 (PR #335, clinical source `29da8fd3`).
The live published root references the accepted Vue build and the frozen
`index.1.html` remains the original functional reference. This is a narrow
correction to 14H149's original batch-variant capability, **not a redesign**.

Affected migration IDs: **NFQ-003, NFQ-004, NFQ-038**. All remain **Partial**:
full search/scientific parity, actual live-record acceptance, user accessibility
review and clinician sign-off are still outstanding. This phase changes no
treatment, interpretation, account, approval, regulatory or genotype contract.

## Source-observed defects

1. `RealVariantSource.get(id)` accepts 1–18 digit canonical positive decimal
   IDs and independently rejects record-identity mismatch. However the batch
   input parser required `token.length >= 2` before considering a valid ID,
   incorrectly discarding a legitimate record such as **#1**.
2. The 14H149 batch result container used `max-height:430px;overflow:auto`
   (360px on mobile). Up to 100 results were rendered into an independently
   scrolling area, making mobile and keyboard navigation unnecessarily complex.

## Implementation

- Numeric identity: accept **#1** and other canonical 1–18-digit positive
  decimals, route them through existing `get(id)` without nomenclature or fuzzy
  reinterpretation. Reject `0`, `01`, overlong numeric IDs and unsafe input.
  Name/alias matching and candidate logic retain exactly the prior live adapter
  semantics; no unverified candidates become automatically confirmed.
- Long results: render the first 12 source outcomes, then reveal up to 12 more
  per explicit button press. The summary and CSV export always refer to the
  **entire successfully resolved batch** (up to the existing 100-entry limit).
  There is no nested batch scrollbar. Changing input, cancelling or opening a
  dossier clears stale results and resets the disclosure count.
- Preserve compact quiet actions, original white/blue Daylight and Midnight,
  mobile-native inputs, tab navigation, hover/focus affordances and existing
  workspace destinations. No new app surface or dependency.

## Tests and release gates

- Unit: parse canonical single-digit identity, reject zero/leading-zero/
  overlong numeric inputs, GET-only numeric lookup and the unchanged exact vs.
  candidate distinction; retain cancellation and three-worker concurrency.
- Connected browser: test-only intercepted source returns record #1, verify
  13-result list begins with 12 visible outcomes, reveal the last outcome,
  ensure no nested result scrolling or horizontal overflow, export full CSV,
  open a verified dossier and assert no read API writes. Ordinary five-therapy
  and 14H149 research-session tests remain in their existing suites.
- Before merge: clinical TypeScript, Vitest, all Playwright suites, five-therapy
  connected contracts, legacy integrity, endpoint/deployment safeguards and
  38-capability parity tracking must all pass. Independently verify the actual
  published root and a real-source numeric record after release. Passing
  synthetic contracts does **not** establish real-source clinical acceptance.

## Hard boundaries

No Supabase/RLS changes; no clinician invitations; no Helios, curation or
scientific review action; no class/subtype, ETI, Alyftrek, five-regimen or
jurisdiction change; no patient data, server write, analytics event,
backend change or neumDESK modification. No modification to frozen legacy
`index.1.html`. A merged PR is not, by itself, proof of deployment or
clinical equivalence.
