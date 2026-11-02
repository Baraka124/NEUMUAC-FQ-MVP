# 14H66–68: original source and migrated scientific evidence reconciliation

The previous 14H63–65 GitHub clinical-foundation workflow completed successfully together with legacy integrity, endpoint inventory, non-deployment guard and functional parity workflows.

The offline read-only reconciliation script now compares exact variant IDs, functional class/subtype, independently recorded ETI and Alyftrek responses, and each therapy's evidence level, evidence tier and authority source. Contradictory or missing source metadata is recorded in `differentFields`; it is never silently normalized into agreement. The newly added regression tests cover altered tier, authority and missing evidence level.

To perform actual-data reconciliation, provide two separately obtained, authorized, de-identified inventories in the documented normalized profile format, run `node scripts/reconcile-therapy-baseline.mjs ORIGINAL.json MIGRATED.json REPORT.json` locally, review `matched` and `differentFields`, and investigate source claims without modifying original records. This repository change does not run against any real dataset, does not certify complete original-system parity and does not activate geography.

Further work: compare archived legacy evidence sources and their complete variant inventory, verify all original record IDs and count, and resolve findings through scientific review with independent record provenance. Keep evidence-tier disagreements separate from response disagreements.
