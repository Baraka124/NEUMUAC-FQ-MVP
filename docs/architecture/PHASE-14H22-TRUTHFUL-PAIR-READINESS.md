# Phase 14H22 — Truthful comparison readiness

## Interaction contract
Two selected CFTR variant identities only mean that the **variant comparison selection** is complete; they do not prove that therapy evidence was fetched successfully.

The five-regimen component now reports its actual `loading`, `ready`, `error` or `unavailable` state to the parent. The compact selection bar renders a truthful, screen-reader-announced status. The existing **View therapy comparison** action always opens the real result or its actionable error/retry state. A data failure cannot display **ready**.

## Automated acceptance
- Pure tests guard the mapping for all four statuses.
- Isolated Vue browser contract verifies successful five-regimen readiness.
- Failure/recovery browser contract forces an actual therapy endpoint failure for a selected pair, then checks **failed**, five rows absent, Retry, five rows present, **ready**.
- Class I ETI/Alyftrek values and strict source identity remain unchanged.
- No changes to database values, regulatory rules or Helios approval.

## Production gate
Production visual verification remains pending until an authorized Vercel team grant is available. CI with intercepted source data is not a substitute for a real clinical session, screen-reader evaluation or deployed commit verification.
