# Phase 14H24 — Read-only production release audit

This is an executable acceptance gate for **which source revision is deployed**, independent of a GitHub merge. It does not change the site.

## What the tool checks

`npm run test:release` tests the offline verifier: exact SHA, absent/duplicate/invalid marker, redirects, content type, network failure, fixed public origin, GET-only, no authorization/cookies. The clinical-foundation GitHub workflow also checks that the built `dist/index.html` embeds the exact `GITHUB_SHA` used by CI.

`node scripts/check-public-release.mjs` makes **one** unauthenticated read-only GET to `https://fq.neumact.org/`. Its expected revision comes from `NFQ_EXPECTED_COMMIT` (40-character Git SHA); it rejects unexpected redirects, missing/duplicate markers, stale commits, invalid HTML or unavailable origins. No source records, staff accounts, emails, geographic events or Supabase requests are involved.

The manual GitHub workflow `production-release-audit.yml` is triggered via **Actions → neumuacFQ public production release audit → Run workflow (branch main)**. It compares the selected `main` commit against the public site. Only after this succeeds can its optional **run_live_browser** action execute the existing opt-in public read-only Playwright acceptance (real CFTR records and five-regimen workflows, without logging in). The browser stage makes no database mutations and uploads no screenshots as build artifacts.

## Status and important limits

This checks **deployment identity** and optionally **public read-only behavior**. It does not certify current treatment indications, the staff-authenticated workflow, clinician review, individual genotype interpretation, or a visually signed-off production release.

A newly merged commit that has not yet reached Vercel produces **STALE**, not a passing status. A build without a trusted SHA returns **UNVERIFIED**. Those are correct, actionable outcomes.

Vercel team access for `neumact` currently returns 403; this manual public check is a useful independent verification route, but Vercel project configuration and deployment logs remain inaccessible until access is authorized.

No paid staging, deployments triggered by this phase, RLS changes, scientific edits, or geographic hit/miss recording.
