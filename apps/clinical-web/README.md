# neumuacFQ · Vue clinical research workspace

Vue 3, TypeScript, Vite, Pinia, Supabase (read-only research services), Vitest and Playwright.

## Current deployment and migration status

The Vue build is deployed through the repository root `index.html`; the frozen legacy application is preserved as `index.1.html` (SHA `c18221fb6baf47782318ca3685b94b088c359a66`). The original Phase 1A scaffold instructions previously in this file are historical and **do not** describe the current deployment.

The migration remains **incomplete**. A published Vue build does not establish functional equivalence, scientific validation, or safe authenticated write permissions. The authoritative inventories are:

- [Legacy functional/data-flow inventory](../../docs/architecture/PHASE-0A-FUNCTIONAL-DATA-INVENTORY.md)
- [38-capability migration register](../../docs/plans/LEGACY-FUNCTIONAL-PARITY-REGISTER.md)

Each phase must identify affected NFQ IDs, preserve working legacy behaviors and describe outstanding acceptance criteria. No synthetic scientific production records or speculative clinical conclusions.

## Local checks

From `apps/clinical-web`:

```sh
npm ci
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run test:e2e:live` runs the separate real-data browser acceptance configuration and is **not** interchangeable with normal, isolated CI. Consult its config and the repository's manual live-acceptance workflow before running. A passing deploy status, passing unit/Playwright suite and successful live scientific acceptance are independent signals.

## Interface principles

Keep a restrained institutional research-workbench design: precise type hierarchy, proportional login/search surfaces, no duplicate headings, and no verbose guidance occupying scientific content. Put genuine context and limitations in accessible, keyboard-operable `i` disclosures; preserve visible actionable controls, understandable loading/empty/error states and responsive behavior. Exact unambiguous matches should open immediately; uncertain matches must not.

## Data and permissions

Public research reads must remain usable without sign-in where database policies permit. Authentication, authorization and RLS are separate; a configured public client key does not confer write rights. Never enable or infer editing, review approval, patient-context processing, or privileged backend behavior solely from frontend implementation.
