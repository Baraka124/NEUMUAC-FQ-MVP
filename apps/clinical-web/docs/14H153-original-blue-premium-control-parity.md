# 14H153 — Original blue hierarchy and precision-control acceptance

## Reference and real defects

Owner screenshots dated 15 November 2026 identified duplicate input outlines,
visually padded secondary buttons, ETI/response hierarchy imbalance, cramped
vertically scrolled filters, weak contrast in record headers, green text leaking
into a blue-themed research navigator, confusing Geography selection controls,
and a bulky workspace switcher.

The original visual baseline is documented in `src/original-signature.css`:
night `#05091a`, sidebar `#0c1422`, surface `#0f1d30`,
electric `#2979ff`, restrained cyan `#22c8d8`, and daylight paper
`#f4f5f7 / #162540`. Do **not** replace this chromatic hierarchy with a
uniform blue fill, random green labels or generic filled CTA rectangles.

## Scope and interaction contract

- **Search:** single wrapper with border and one controlled focus halo.
  Inner native `#search` has no second stroke, outline or shadow. Input name,
  binding, query constraints and clear action unchanged.
- **Controls and regimen:** compact and quiet source-inspection actions,
  Saved, Filters, Batch, session and informational buttons, but retain focus
  affordances; ETI/Alyftrek therapy label now visually coequal with a calmer
  recorded status chip. All five regimens and evidence disclosures remain.
- **Filters:** horizontal research panel on desktop, narrow mobile overlay;
  three legible groups (biological context, recorded therapy response,
  find/organize), contextual explanation of genotype-rule versus
  individual-variant response, live changed-preference count, reset and view
  results. Existing five v-models, URL criteria and computed filtering are
  unchanged. `View results` closes the panel; changes already apply live.
  Keyboard opens the panel heading and Escape closes it.
- **Geography:** Coverage (Spain/international) is distinct from the single
  selected Region. Map, native region picker and optional name index all read
  and write the same selection. Selecting from the index closes it and focuses
  its regional detail. Preserve all Spain regions, geographic boundaries,
  caveats and no personal-location claims. Recolor both static map and chrome
  using original navy/slate/cobalt blue vocabulary and legible paper/ink
  contrasts (no arbitrary green text).
- **Workspace launcher:** no double-bordered input, compact close action,
  narrower rows, distinctly readable heading/description in both themes,
  preserved Ctrl+K/search/destination navigation, and no heavy white close
  square or excessive interior scrolling.
- **Theme:** `premium-control-coherence.css` loads after the accepted visual
  finish so that the same original blue family applies in Daylight and
  Midnight; scientific response semantics still use their meaningful red,
  green or neutral treatment (never reclassified by CSS).

## Non-regression / safety

**NFQ-002, NFQ-003, NFQ-004, NFQ-015, NFQ-030 and NFQ-038 remain Partial / Not migrated as previously documented.**

No Supabase migrations, research-data writes, fake production data,
class/subtype or therapy-rule logic, ETI/Alyftrek computations, source
interpretations, account/role/invitation or Helios approval changes. Frozen
`index.1.html` and neumDESK untouched.

## Verification requirements

New Playwright smoke checks in `e2e/premium-control-coherence.spec.ts` must
cover each theme at existing desktop/tablet/mobile widths: search border,
focus indication, guided-filter state, reset/done, Geography map/index/picker
consistency, strong readable region title, switcher contrast, close size,
filtering and no horizontal overflow. Existing TypeScript, unit, Vite build,
five-treatment contracts, curation tests, original-legacy and deployment guard
checks must all pass. Manual browser acceptance of `fq.neumact.org` on actual
screens remains independent of automated contracts.
