# 14H63–14H65 · Original five-regimen rule parity

## Source and scope
The current production-code implementation is `src/domain/legacyFiveRegimenRules.ts`, which describes its rules as derived from frozen `index.1.html` functions `MODULATOR_MAP` and `computeCompoundHetVerdict`. The archived HTML could not be read as text through the connected repository file retrieval. Do not claim that a side-by-side line-level comparison of the original script has occurred.

## Concrete behavioral acceptance matrix
The Vitest suite `src/domain/legacyFiveRegimenRules.test.ts` now tests:
- Five distinct regimens and preserved order; brand aliases are not extra regimens.
- An exact F508del/F508del pair matches the original Symkevi and Orkambi research-name rules.
- F508del plus a listed ivacaftor variant matches the Symkevi research rule, but not the Orkambi F508del/F508del rule.
- An original ivacaftor-list member (D110H) versus an unlisted near-name (D110E).
- Pair order reversal does not change outcomes.
- Responsive Class I ETI record without a qualifying evidence tier remains `needs-evidence`, never silently converted to an approved treatment.
- Independent Alyftrek clinical-trial Class I exception; three genotype-rule therapies never inherit variant response values.

## Remaining certification gates
1. Obtain readable, original frozen `MODULATOR_MAP` and `computeCompoundHetVerdict` implementation and compare branches, canonical name lists, negative/missing evidence paths and output categories against current logic.
2. Execute the original and current calculator against **the same** authorized and de-identified record pairs; log raw and interpreted outputs, including all Class I exceptions. A passing modern-unit-test suite is not original-versus-modern execution.
3. Compare all original source variant IDs, class/subtype, independent ETI/Alyftrek response values, evidence tiers and exceptions using the existing reconciliation tools.
4. Validate historical EU registry coverage separately from therapy matching: Orkambi EU registry absence is not evidence of no clinical authorization.
5. Verify the live deployed build and mobile five-regimen interactions; UI acceptance must be visual and keyboard-tested.

The tests are fixture-based and do not change any research data, calculated classifications or geographical recording state.
