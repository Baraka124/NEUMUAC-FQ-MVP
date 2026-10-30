# Phase 14H21 — Staff-session genotype restoration

**Issue discovered:** the comparison view previously created its read-only variant repository without the existing staff-session provider. When configured with `VITE_NFQ_READ_ACCESS_MODE=authenticated`, the search and two-member restoration can fail even while the variant dossier is correctly authorized.

**Implementation:** pass `authSessionProvider` into the existing read-only repository, and independently retry missing URL-selected variants after sign-in finishes. Already selected members are preserved, and the other member's search/evidence is not interrupted. No API, RLS or user-identity claims are changed.

**Regression:** `pendingPairRestoration.test.ts` verifies both-member recovery, selective retry, signed-out behavior, anonymous-mode behavior and no stale-identity reuse.

**Acceptance boundary:** CI tests verify the interface contract, not a live staff-login session. Real signed-in production acceptance still needs the Vercel project grant and an authorized end-user browser session. No staff token is stored in test artifacts.
