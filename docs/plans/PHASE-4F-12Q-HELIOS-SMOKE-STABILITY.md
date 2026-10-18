# Phase 4F-12Q — Helios stable browser contract

Recover Phase 12P's genuine navigation to Evidence & Curation, then prevent test regressions of the sort identified in #146, #151–#153.

- Bind narrow `data-testid` anchors to Helios's status banner, independent Review/Signals/History/Evidence regions, tab controls, examination steps, locked-feature indicators and recorded-evidence link. These are **test locators**, not additional UI, permission flags or public data.
- Browser tests select controls by stable identity, then continue independently to assert **real** semantics: `aria-pressed`, button types, region visibility, an available route to scientific reference records, and the continued absence of unauthorized review/scan controls.
- Avoid fragile `getByRole('status').first()`, ambiguous class selectors, and matching navigation labels as the only means of identifying the tested control; text and labels can be reviewed as user copy separately.
- Keep `role=status` for accessible status announcements; never convert a locked indicator into an apparently executable action.
- No Helios backend reads, user-role inference, production database change, geographic session recording, or fabricated records.
- The 38-item legacy register still requires independent deployed functional parity; this test stability work does not change its statuses.

**Acceptance:** Vue TypeScript check, browser smoke on desktop/tablet/mobile, legacy integrity, endpoint inventory, non-deployment guard and functional-parity tracking all pass before main merge.
