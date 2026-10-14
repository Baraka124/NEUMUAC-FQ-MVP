# Phase 2H — Trusted review engineering acceptance

- [x] Design a pure, typed review transition model with optimistic version, revision, permission and idempotency checks.
- [x] Require distinct scientific/engineering or privacy/engineering roles; proposer cannot approve.
- [x] Require separate release-manager authorization and verify that already approved decisions cannot be silently changed.
- [x] Cover rejection, stale revisions, unverified evidence, replays and invalid role transitions in synthetic unit tests.
- [ ] Supabase project schema/RLS/role metadata verified with authoritative owner access.
- [ ] Implement and deploy transactional backend RPCs in an **isolated staging project**.
- [ ] Enforce idempotency/event immutability within PostgreSQL, including concurrent transaction and failure injection tests.
- [ ] Implement review authentication using trusted claims, not metadata supplied by browser.
- [ ] Clinical/scientific reviewer validates reference evidence and actual nomenclature decisions.
- [ ] Separate release control approvals; production migration and roll-back rehearsals.

The code in this PR is a design and test contract, not production-ready backend enforcement. All three Phase 2F discrepancies remain pending. Neither old nor new application is connected to this model.
