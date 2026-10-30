# Phase 14H19 — Five-regimen end-to-end browser contract

NFQ-014 / NFQ-015 / NFQ-024 / NFQ-026 / NFQ-038.

The previous browser CI exercised a Vite application with no live-source configuration; it could confirm honest empty states but not that users could actually navigate an ETI/Alyftrek response or a populated five-regimen comparison.

This phase adds `playwright.contract.config.ts` and `therapy-browser-contract.spec.ts`, run in the existing GitHub Chromium job after the disconnected browser suite.

- The **real Vue pages** run with **test-only API responses** intercepted at an intentionally non-routable endpoint. Fixtures never ship in `src`, never access production and never write to Supabase.
- Checks: five regimen rows; Class I exceptional subtype; independently recorded ETI and Alyftrek categories; variant-scoped review link; actual Retry after a simulated transient read failure; genotype result navigation; keyboard focus; historical EU reference coverage and Orkambi absence; no page-width overflow at desktop and phone sizes.
- All API calls are GET-only in the test harness. No fake success status appears after a failed scientific read.
- This makes connected workflows an engineering CI requirement **without** claiming live fq.neumact.org acceptance. Local mock success is not evidence of current regulatory source accuracy, clinician review sign-off or production deployment.
- Production Vercel inspection currently requires an authorized `neumact` team grant. Vercel project/deployment metadata and actual public browser screenshots have not yet been verified; record them as pending, not passed.

**Next:** restore actual visual and accessibility consistency found in the dossier while retaining the source and validation controls. Full production acceptance remains explicitly gated.
