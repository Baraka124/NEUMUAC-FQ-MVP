# 14H157 — Variant-specific geographic context without blind navigation

## Source and scope
The current public Geographic atlas exposes **administrative boundaries of Spain**, not a per-variant geographic dataset, clinical prevalence, verified variant-linked search counts, patients or institution attribution. The user requested an unobtrusive globe action on variants that provides a useful answer in place and opens the atlas only by choice.

## Functional contract
- A verified dossier shows a **40px accessible globe target** beside Save and Copy link. It is contextual to each selected record, using that record's **source-verified** display name and canonical database ID.
- Click opens a tiny popover. It explicitly states **No verified geographic information is currently published for this variant.** It never displays inferred statistics or a misleading regional color overlay. The current variant dossier stays visible behind the popover.
- `Open atlas` passes only a validated positive 1–18 digit database ID using Vue Router's hash-history query (`#/geography?variant=<id>`). It does not send a fabricated name, geographic attribution, patient, search history, coordinates or role context. The future atlas reads this ID under a separate, bounded display contract.
- Popover can close via Escape, explicit Close, click outside, record change or route unmount. Escape restores focus. The UI does not create second scientific navigation tabs, modals or elaborate empty cards.
- Unverified search-only candidates do not acquire a misleading geographic dossier action. No clinical data or source APIs are queried or written by this shortcut.

## Acceptance
New unit tests reject malformed/noncanonical IDs. Connected browser acceptance at 320, 390 and 1366 px confirms source-name identity, genuine absence of published geography, focus/close, no navigation on opening, exact ID link, viewport containment and GET-only catalog behavior. Existing five-therapy, search, curation, legacy-integrity and scientific parity checks remain mandatory.

**NFQ-030 remains Not migrated.** This does not create geographic research activity. The frozen original, scientific models, permissions and backend remain unchanged.

**Phase 14H158** will consume the exact `variant` query in the compact atlas header, with a small no-data note and a reversible link to the verified dossier; do not present the deep link as a data source before that phase is integrated.
