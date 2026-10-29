# Phase 14H5 — ETI dossier information hierarchy

The previous source response module created a wide, empty-feeling block with an all-caps historic-record label and a prominent repetitive disclaimer. It hid the primary research navigation behind a disclosure and treated a literal `unknown` string as an oversized verdict.

## Interface contract
- Put ETI response category first. Display `responsive`, `non_responsive`, `unknown`, and absent as separate historical states; no invented clinical conclusion.
- Show the recorded-category field label above the value, with a single short explanation. Put methodological cautions in the existing accessible ContextHelp.
- Use a balanced two-column summary/source layout on desktop and a single column below 820px.
- Make original database metadata an optional secondary disclosure. Keep the related research links directly discoverable.
- The source-specific row contents and recorded-field parity checks retain their original semantics and remain visible without opening a separate scientific details drawer.

## Next phase 14H6
Compact the source-specific panel, remove duplicate scientific disclaimers, communicate missing source records and genuine contradictions contextually, and validate the result with responsive browser checks. Preserve all original negative/unknown/contradictory distinctions.
