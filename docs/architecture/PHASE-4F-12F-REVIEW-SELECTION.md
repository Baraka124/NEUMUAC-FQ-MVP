# Phase 4F-12F — Review selection contract

Helios preserves a single workspace for queue, evidence and history. A selected review opens the comparison step in the same workspace, with an explicit return path to the queue. No route jumps, invented cases, automatic approvals or unstable drawers.

**Not connected:** `availableReviews` deliberately remains empty; `openReview` is a UI transition prepared for a future authorized, server-filtered review collection. Do not populate it from public `helios_pending_review`: the inspected database has permissive anonymous read/write permissions. Phase 11J–11L security remediation and Phase 12D published-projection authorization are prerequisites to real data.

Acceptance before enabling: reviewer entitlement checked server-side, filtered source-backed proposal identity, stable focus return, no implicit decisions, keyboard and mobile coverage, and truthful loading/empty/access-denied states.

This phase does not implement live review selection or grant reviewer access.
