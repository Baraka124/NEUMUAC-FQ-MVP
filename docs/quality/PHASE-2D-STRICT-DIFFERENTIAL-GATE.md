# Phase 2D — Strict Search Differential Gate

**Status:** Engineering regression safeguard. **Production:** unchanged.

Phase 2C detected 13 matching cases and two mismatches across 15 controlled queries. Phase 2D adds an explicit reviewed-deviation register: `apps/clinical-web/tests/differentialPolicy.ts`.

**The register is not clinical approval.** The categories `pending-clinical-review` and `pending-technical-review` remain open, and are accepted solely as known differences while the synthetic characterization suite is being developed.

The differential report now fails CI if:
- Any query produces an unregistered normalization, ordering or gate difference;
- A known deviation changes in kind;
- A previously registered test case disappears.

Each CI run continues to produce `search-differential-report.json` with detailed case-level evidence. Real-data migration is still blocked by scientific sign-off, server-side authorization evidence and controlled clinical parity fixtures.

## Deliberate exceptions
- `ΔF508`: different result IDs/order; requires nomenclature review before canonical alias changes.
- `patient treatment report`: structural gating differs; product policy must distinguish UI search rejection from research analytics collection.

## Next action
Extend the corpus with controlled cases; resolve differences through reviewed changes, removing corresponding exceptions **in the same PR** and demonstrating strict CI. Preserve the production `index.html` and `CNAME`.
