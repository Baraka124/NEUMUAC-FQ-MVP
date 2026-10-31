# 14H39–14H41: verified acceptance

## 14H39 — CI correction
The previous clinical-foundation run failed in `therapyReviewBrief.test.ts` because the expected review-brief strings predated the source-provenance format. Tests now assert the explicit source type for all five regimens. Confirm `npm test`, `npm run test:migration`, differential checks, build and browser contracts complete in a new GitHub Actions run before claiming a green release.

## 14H40 — production release acceptance
The authenticated live browser and the public origin remain separately unverified. Do not conflate the successful intercepted-data Playwright contract with real source-record behavior. Confirm the actual `nfq-release-commit` from public HTML and the associated Vue build, then run signed-in exact-variant and genotype flows on desktop and mobile. Record the actual observed commit and outcomes; no clinical writes or geographical recording.

## 14H41 — source reconciliation
The offline audit now has a regression for complete, internally consistent source records without false review flags. The original dataset remains the authority for coverage counts. Run the audit on an authorized, de-identified full snapshot and inspect the discrepancy IDs before declaring complete scientific migration. No original classifications are changed by this batch.
