# 14H142 · Phone-native interface acceptance

## User review and scope

The project owner reviewed the real Android Chrome mobile recording
`Screen_Recording_20261114_002502_Chrome.mp4` and reported that desktop/laptop
was visually excellent, while the phone was not yet at the same standard.

The defects are chiefly interaction density/fit rather than missing science:
the cramped utility header, an unlabeled-looking workspace switcher,
large source cards, two-row Helios tabs and a separately scrolling
variant-result list on a short viewport.

**Do not redesign the already accepted desktop application.** The mobile
layout lives in `src/phone-native.css`, imported after the stable original
Daylight/Midnight palettes, and is limited to viewports at or below 760px.
The app's original HTML reference is left untouched.

## Implementation

- Header: 56px visual height, compact Workspaces menu, explicit mobile
  neumuacFQ identity, recognizable search icon for workspace switching,
  responsive research identity or sign-in, and small accessible icon logout
  when signed in. Keep the existing `Workspaces` accessible name so screen
  readers and established connected navigation continue to work.
- Drawer: full research workspace list and account access retained, safe
  vertical scroll, theme switch retained at both 320px and tablet-phone widths,
  correct offset and backdrop below the sticky header.
- Variants: four initial visible result rows with explicit **Show all** control;
  expands to the same already loaded page, never discards results or changes the
  search, filters, selected variant, pagination or backend queries. One primary
  vertical scroll on phones replaces a nested scroll box. Keyboard navigation
  only focuses currently visible search results.
- Evidence: reduced card and metadata spacing, no loss of source identifiers,
  provenance links, recorded values, curation, PubMed lookup or review drafting.
- Helios: original four review areas remain available as a one-line horizontally
  swipeable navigation rail with no scientific review authorization change.
- Font: 16px phone search and text input sizing avoids unrequested browser
  zoom when focusing fields.

## Test/acceptance boundary

The repo's Playwright checks now cover 320, 390, 430, 760px header layout,
recognizable menu/search controls, reliable drawer close and complete navigation,
Daylight/Midnight preference access, Helios single-row navigation and
horizontal containment, plus explicit desktop regression at 1366px.

The connected scientific browser contract adds synthetic 6-variant coverage at
390px to verify four visible matches, opt-in full expansion, no nested vertical
scroll and original dossier selection. No live data is written or invited.

Also require clinical unit/build, connected five-therapy, authenticated curation,
full browser smoke, legacy integrity, functional parity, endpoint inventory and
non-deployment checks to pass. A passing automated suite does not replace
viewing the real deployed preview on Android Chrome in both appearances.

## Deployment boundary

Draft PR #327 stacks on #326 (which stacks on #325). No public deployment,
production domain reassignment, database mutation, scientific logic update,
source publication, role grant, invitation delivery, or neumDESK edits.
