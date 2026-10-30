# Phase 14H16 — Recorded jurisdiction, safety, and ETI/Alyftrek research comparison

The original `index.1.html` reads `drug_jurisdiction_rules` and `drug_safety_alerts`. The v2 pair-workspace now provides a lazy, source-specific GET-only reference panel instead of treating static legacy notes as up-to-date prescribing guidance.

- Four original EU rule rows mapped to ETI/Kaftrio, Alyftrek, Kalydeco and Symkevi; Orkambi deliberately shown without a matching registered EU rule.
- Both query sources strictly select known columns, `is_active=eq.true`, bound page size, validate schemas/IDs, abort on dismissal, and fail closed on unavailable or unauthorized reads. Historical `is_active` is **not** current regulator approval.
- Regimen-specific safety rows are displayed by their recorded drug identity. Other interacting medication records (e.g. azoles) are counted separately, never automatically assigned to ETI or Alyftrek or treated as additional modulators.
- ETI/Alyftrek treatment comparison remains the pair-rule result table. A matching rule is **not** clinical eligibility; no switching orders, monitoring schedules, dose alterations or patient-treatment recommendations are generated.
- No new RLS grants, regulator approval claims, backend writes, Helios approvals or geography telemetry.
- Optional one-panel reference discovery supports progressive disclosure and mobile view; current regulator and clinician verification are separate acceptance tasks.
