# 14H155 — Focused Spain map discovery and accessible region navigation

## Continuity and user intent

Phase 14H154 removed the duplicate 19-button Region index. The remaining map and native `Choose a region` picker share the single selected-region state. The next targeted usability gap is **discoverability within the map**: before activation, users must rely on the browser's native SVG tooltip to identify each boundary; keyboard users must tab through 19 individual region paths.

The 14H155 change improves the *existing map*, not by adding cards, columns, filled buttons, filters or invented research data.

## Behavior

- Pointer hover and keyboard focus display the **real region name** in the existing small map-header context line, in place of “17 communities · 2 autonomous cities” while previewing. Leaving restores that original line. The header's layout footprint is preserved, with ellipsis on narrow widths.
- The 19 geometry paths and corresponding `aria-label` /`aria-pressed` states are unchanged. One map region is reachable with **Tab**; **Arrow keys** traverse the actual 19 regions, wrapping at the ends; **Home/End** jump to the first/last; **Enter/Space** select; **Escape** clears a selected region.
- Selecting from the native dropdown updates the same selected-region state *and* the keyboard entry point. Clearing does not invent a blank region, and switching Scope to International resets region/preview state. Returning to Spain retains map and dropdown capability.
- Screen readers get a visually hidden instruction attached to the existing map's `aria-describedby`. The preview is not an extra panel or live-region announcement; the selected detail heading retains its existing announcement.
- Visual hierarchy uses the established ink/slate/cobalt family in Daylight and Midnight. Stronger selected/focus outline is blue, never an arbitrary green accent. No extra page height, duplicate labels or floating blocks.

## Acceptance

A connected browser regression verifies preview text without header shift, a single `tabindex=0` entry, arrows/Home/End/Enter/Space/Escape behavior, shared dropdown synchronization, complete suppression of the redundant index, and no horizontal scroll in phone/desktop and both themes. Existing 320px–1600px Geography and five-treatment tests remain mandatory.

This is a **public administrative-boundary visualization**; it does *not* display verified searches, clinical patient locations, treatment response by geography, institutions or country aggregates. **NFQ-030 remains Not migrated.**

No source boundary geometry, scientific variant data, therapies, source review, authorization, Supabase/RLS, account management, infrastructure, neumDESK or frozen `index.1.html` is changed. Production/public-domain visual acceptance is a separate release check.
