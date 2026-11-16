# 14H158 — Atlas-first layout and verified variant context

## Why
The screenshot shows too much vertical distance between the workspace navigation,
Geographic atlas heading, controls and the map. Context from the variant globe
in 14H157 must not become an empty standalone module or fictitious statistics.

## Presentation contract
- A compact title/subtitle line begins the page directly, overriding the
  legacy `.page` top padding **only on Geography**. The main atlas follows
  after a small gap. Map-heading and region-selector spacing are tightened
  without changing map boundaries, 19 region options, keyboard behavior,
  region detail or focus target sizes.
- Opening `/#/geography?variant=<canonical ID>` shows one tiny **Variant
  context** note in the existing header. It identifies the record by ID
  immediately and, where the existing authorized read-only catalog returns a
  matching record, updates the display name from that independently verified
  source. Failed/denied/unconfigured reads retain `Variant #ID`; never
  fabricate nomenclature or derive region-specific numbers from the ID.
- The note explicitly states **No verified geographic information is currently
  published for this variant**. It includes an ordinary **Return to variant**
  link. The Spain boundary map remains geographically neutral regardless
  of context; it does not highlight regions without a real dataset.
- Malformed/zero/leading-zero/overlong query IDs are discarded from the UI.
  Direct atlas visits show no variant context. No untrusted query-supplied
  variant name or cached classification is accepted as evidence.
- Daylight/Midnight maintain the original precise navy/white/electric-blue
  hierarchy. Context is compact and quiet, not a new colored card.
- On route change/unmount an in-flight read is aborted. No server writes,
  patient data, geolocation, analytics or role modifications.

## Verification
The connected Playwright contract confirms that ID 18 displays a source-verified
`R117H` name only following a real test fixture GET, displays honest no-data
status, retains 19 boundary paths and native selector, avoids overflow,
maintains a compact gap to the atlas at desktop/mobile widths, and returns
to the precise dossier. Invalid and unlinked routes show no variant attribution.
Phase 14H157's popover and five-treatment scientific regressions remain.

**NFQ-030 still Not migrated.** Source identity is not geographic evidence.
`index.1.html` and all scientific/permission/backend/database contracts remain
unchanged. Public-domain visual acceptance must still be checked independently.
