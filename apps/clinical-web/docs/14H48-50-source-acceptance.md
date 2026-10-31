# 14H48–50: reproducible source acceptance

14H48: Previous PR #244 Vue TypeScript and connected five-therapy browser contract jobs passed. Browser smoke was still running when inspected. A live release cannot be accepted from CI alone; the public host remains inaccessible through the available browser.

14H49: Run `node scripts/reconcile-therapy-baseline.mjs ORIGINAL.json MIGRATED.json REPORT.json` using separately prepared, authorized, de-identified original and migrated variant profiles. The command compares exact variant IDs, functional class, subtype, and independent ETI and Alyftrek response categories. Missing and unexpected IDs are reported. Existing source data are never changed. The output cannot replace either input file.

14H50: `npm run test:migration` now runs both the inventory audit and original-baseline reconciliation regression tests in the established GitHub Actions clinical workflow. These tests use fabricated isolated records and do not establish completeness of the real original dataset. Do not commit actual source exports or modify scientific classifications based on a historical boolean. Geography recording stays disabled.
