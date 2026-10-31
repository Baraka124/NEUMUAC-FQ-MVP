# 14H45–14H47 — Release and scientific migration acceptance

## 14H45: verified automated baseline
The previous clinical-foundation run associated with PR #243 completed successfully for Vue TypeScript/check, clinical browser smoke, and connected five-therapy browser contract. Integrity and parity workflows also passed. This is a verified CI result, not a claim that production is serving the same commit.

## 14H46: independently identify deployed code
The root deployment commit in GitHub is not the same as the `nfq-release-commit` marker embedded in the HTML. Always use the exact marker's SHA as `NFQ_EXPECTED_COMMIT` with `node scripts/check-public-release.mjs`, then independently check the live JS/CSS assets and a signed-in clinical session. The public host could not be retrieved from the available browser; therefore live release acceptance remains NOT VERIFIED. No patient record or authentication token is needed for the static release check.

## 14H47: full original-data reconciliation
The offline audit now provides an explicit `reviewSummary` with total and unique variant IDs, duplicates, incomplete profiles, invalid coverage and responses, historical ETI/Alyftrek flag discrepancies, and recorded Class I responsive exceptions. These numbers are only meaningful when run against a complete, authorized, de-identified snapshot of the original source. Do not confuse a passing fixture test with full dataset reconciliation, and do not auto-correct scientific responses from historical booleans. Geography stays disabled.
