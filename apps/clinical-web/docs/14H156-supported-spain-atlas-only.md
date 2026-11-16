# 14H156 · Remove unsupported International Scope

## Verified gap

The Geography atlas provides one actual administrative-boundary dataset:
Spain's 17 autonomous communities and two autonomous cities, including the
Canary Islands inset. The previous `Scope` control also offered `International`,
but that mode displayed only a generic empty globe, a statement that
country-level research aggregates were unavailable, and a `Return to Spain`
button. It had **no country boundaries, source records or independently useful
research workflow**.

Showing a selectable but empty mode misleads users about the available
capabilities and consumes otherwise valuable space.

## Implementation

- Remove `Scope`, its `Spain / International` dropdown, the unsupported
  International globe placeholder and return button, and now-unused scope state.
  Spain remains the **single actual supported atlas**. This is not merely
  hiding the control with CSS.
- Keep the existing full public Spain boundary map and its 19 real
  administrative names/shapes, map hover and arrow-key discovery,
  `Choose a region` native dropdown, selected detail, clear action and
  keyboard navigation.
- Keep the information text explicit that regional search, matches,
  patient locations and organizational attribution are **not** verified or
  published. The existence of a boundary map does not imply research-activity
  analytics.
- Preserve the 14H153 original premium ink/cobalt/cyan Daylight/Midnight
  palette and the compact 14H154 layout with no Region index.
- Update browser regressions to require the *absence* of the Scope selector
  and unsupported International surface while validating selection continuity,
  19 boundaries and disclosure at mobile and desktop widths.

## Release boundaries

**NFQ-030 remains Not migrated.** No international data is invented, no source
feeds added, and no clinical/regulatory/production acceptance is asserted by
the map. No CFTR scientific rules, therapy statuses, genotype interpretation,
evidence, roles, invitations, Supabase, backend, neumDESK or the frozen original
`index.1.html` change.

Require full TypeScript/unit/build and migration/differential suites, connected
five-therapy contract, browser/curation shards, legacy integrity, parity
tracking and endpoint/deployment guards before merging. Then verify the
published root JS/CSS and Railway deployment; `fq.neumact.org` acceptance
remains a separate browser inspection.
