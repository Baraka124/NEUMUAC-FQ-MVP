# 14H78–80 — Cross-device scientific interface acceptance

## Verified baseline
PR #254 passed all five repository workflows, including clinical Vue checks, browser smoke, and connected five-therapy contract tests. This is CI verification, not proof of which build is served at the public host.

## 14H78 — Mobile evidence flow
The connected five-therapy browser contract now exercises a 320px-wide phone viewport. It checks therapeutic workspace navigation, focus after choosing genotype rules, actual Kalydeco detail expansion and absence of document-level horizontal overflow. Original independent Class I ETI and Alyftrek responses are verified in the same test.

## 14H79 — Retained scientific behavior
The existing contract checks preserve five distinct regimens, F508del genotype pair rules, unavailable-data recovery, source disagreement inspections, independent Class I outcomes and EU-reference limitations. None of these scientific response values are changed by this acceptance PR.

## 14H80 — Production verification remains open
The root deployment commit and the public `nfq-release-commit` marker are independent; checking one alone is insufficient. The public host could not be inspected through the available browser in earlier batches. Before declaring production visually accepted, check the static release marker against the expected built SHA, confirm correct JS/CSS assets, perform signed-in and public navigation, inspect 320/375/390/768/1440px routes and review browser traces for clipped controls, modal overlap, inaccessible focus and scroll jumps. This PR cannot certify live deployment or original full dataset reconciliation.
