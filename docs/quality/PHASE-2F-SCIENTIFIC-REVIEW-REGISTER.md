# Phase 2F — Scientific Decision Register

**Not clinical approvals. No application integration.**

| ID | Input | Observed behavior | Proposed disposition | Reviewer needed |
|---|---|---|---|---|
| NFQ-NOM-001 | `ΔF508` | Legacy and modern return different controlled result identities | Pending: evaluate provenance-aware synonym mapping rather than blanket delta replacement | Clinical/scientific nomenclature owner |
| NFQ-NOM-002 | `δF508` | Same class of discrepancy as uppercase delta | Pending: same review, separately tested | Clinical/scientific nomenclature owner |
| NFQ-GATE-003 | `patient treatment report` | Legacy and modern differ on structural rejection | Pending: separate user-facing search decision and analytics collection policy | Security/privacy/product owner |

Any approved change must have a dated reviewer decision, a specific cited source/version, amended differential fixture and removal of its exception **in the same PR**. This file deliberately contains no fictitious reviewer signatures or decisions.

## Technical acceptance

- Search governance functions remain pure and disconnected from production.
- Analytics defaults denied; unrelated search operations never imply permission to collect.
- Existing strict 52-case corpus still passes with the three tracked pending exceptions.
- The legacy application blob and CNAME remain unmodified.
