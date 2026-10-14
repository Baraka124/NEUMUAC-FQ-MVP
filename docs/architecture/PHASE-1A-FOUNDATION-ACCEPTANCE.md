# Phase 1A — Vue + TypeScript foundation acceptance

**Source-of-truth:** legacy root `index.html` and `CNAME` remain unchanged.  
**New application:** `apps/clinical-web`; Vite build output remains nested under `apps/clinical-web/dist`.  
**Runtime:** synthetic examples, read-only typed repository, Vue Router in hash mode, Vue components, simple clinical information hierarchy, responsive CSS and keyboard focus affordances.

**Deliberately absent:** Supabase connection, credential material, clinical classification algorithm, patient information, Helios approvals, exports, unapproved medical advice, and deployment configuration changes.

## Pre-merge checks

- [ ] Vue 3 TypeScript build and unit tests green in GitHub Actions.
- [ ] Existing legacy-integrity workflow green on the PR.
- [ ] Root index.html and CNAME unchanged.
- [ ] New app has no production API URLs.
- [ ] Test data is unmistakably fictitious.
- [ ] Clinical pages beyond synthetic variant worklist clearly say *not migrated*.
- [ ] User-facing design is a Phase 1A architectural prototype, not finalized acquisition-grade visual quality.

## Follow-up

Phase 1B: formalize visual design tokens/components; test 390/768/1366 widths and keyboard/focus journeys with Playwright; review information architecture. Phase 2: scientific fixture parity and authorization review before migrating real variant records.

**Hosting:** GitHub Pages also deploys from main in this repository. A nested source `index.html` has no effect on the root page, but any Pages static copy configuration must be checked before deploying a new app. Do not change build output or production routing.
