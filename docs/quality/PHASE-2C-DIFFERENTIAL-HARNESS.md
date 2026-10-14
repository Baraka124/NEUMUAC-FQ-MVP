# Phase 2C — Differential Search Harness

The baseline HTML is SHA-pinned and its actual search/index/normalization functions are extracted into a sandboxed Node VM with synthetic records only. No whole legacy app boot, network, authentication, Supabase, analytics write, or patient records are permitted. A second TypeScript search implementation receives the same input.

Run `npm run test:differential` under `apps/clinical-web` to produce `search-differential-report.json`, then inspect query-by-query legacy vs modern IDs, ordering, normalization and structural rejection. The test checks that the oracle executes; **mismatches are retained and reported, not silently accepted as parity**. No production deployment is switched.

Known coverage limits: synthetic record fields, minimal legacy state, no clinical-relevance score tie-breaking, advanced analytics, filtering, eponymic approval, live provenance or data security. The real app and root CNAME are unchanged. The mismatch report is an evidence artifact, not proof of clinical validation.

Before actual cutover, build clinically reviewed nonidentifying goldens, review expected deltas and establish strict pass criteria for every safety-relevant class.
