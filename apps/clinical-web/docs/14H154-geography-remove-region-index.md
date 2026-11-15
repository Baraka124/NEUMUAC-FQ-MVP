# 14H154 — Geography: remove redundant Region index

## User-observed issue

The Geography screenshot dated 15 November 2026 showed an expanded **Region index** with 19 full-width region buttons, another disclosure control and a long lower-page surface. It duplicated the existing Spain map and native **Choose a region** picker, adding scroll and unnecessary visual density but no separate research capability.

## Implemented

- **Delete the entire index section** and its Browse all regions / Hide region list control; this is not a default-collapsed panel that could reappear.
- Remove the unused `listMode` state. `Scope` continues to support Spain and International; scope changes continue clearing the selected region.
- Preserve the map's 19 selectable administrative boundaries, their accessible keyboard Enter/Space behavior and selected-state highlighting.
- Preserve the native alphabetical `Choose a region` select (all 19 regions and cities). Selection via either map or dropdown updates the **same** `selected` state, region details and clear action.
- Keep factual disclaimers and the small on-demand `About this atlas and its data` disclosure. The map depicts boundaries only, never invented regional searches, patients, clinical outcomes or institutions.
- Retain the original premium Daylight/Midnight blue palette, responsive layout and footer. With no lower region-index section, the footer follows the data notes without a wall of redundant cards.

## Verification and scope

Reworked the original public map and repeated selection browser regressions to verify direct picker and keyboard map interactions at 320, 390, 768, 1024, 1366 and 1600 px. The 14H153 two-theme browser contract now asserts there is **no** index/accordion, map and picker stay synchronized, and the region title contrast remains legible. Existing five-treatment, scientific legacy, permissions and source read-only tests remain mandatory.

**No scientific logic, recorded therapy outcomes, database writes, Supabase/RLS, user permissions, Vercel/Railway configuration, neumDESK or frozen `index.1.html` changes.** NFQ-030 remains **Not migrated**: a boundary map is not verified geographic research-activity data.

The CI/browser suite confirms controlled functionality; separate verification of `fq.neumact.org` is required to claim public deployment acceptance.
