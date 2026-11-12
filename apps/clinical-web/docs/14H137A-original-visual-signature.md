# 14H137A · Original visual identity: chromatic light workspace + calm controls

## Authority

The project owner's unmodified **`index (85)(1).html`** is the visual and functional baseline. Its dual-theme system uses the midnight surfaces `#05091a`, `#0c1422`, `#0f1d30`; electric blue `#2979ff`; light surfaces `#f4f5f7` and `#fff`; light text `#162540`; and IBM Plex Sans / IBM Plex Mono / Syne font families. Original secondary/ghost controls favor quiet borders and transparent fills, and `.btn-sm` uses a 34px visual height.

The modular V6 had later **Clinical Mineral** and **Ultra System** presentation layers replacing original blue/navy with graphite/green-teal and height/padding overrides. Those layers also include important accessibility and layout work. **They are not removed or overwritten.**

## Implemented

- Add `src/original-signature.css`, loaded last from `main.ts`, scoped to authenticated `.app-frame` research pages. The original night-color navigation is paired with the **already-established white research workspace**. No change to the separate public sign-in/invitation screens.
- Use original documented color tokens and calmer presentation on workspaces, selected variants, source navigation, and recorded ETI/Alyftrek comparison surfaces. *The six scientific CFTR functional-class colors are not repurposed.*
- Target existing named scientific controls (variant/therapy detail actions, evidence links, reference actions and pair-review buttons) with transparent backgrounds, subtle borders, 6px corners, and restrained 7px/11px padding. Maintain a **40px interactive floor** instead of shrinking accessible targets.
- Retain existing layout/scroll/focus/mobile controls. For narrow screens, keep selected research navigation visible and prevent new overflow.
- Retain a **font fallback stack** rather than remote font loading; typography should not depend on a third-party network or expose font assets.

## Intentional limitation / next scoped iteration

This release **does not expose a partially implemented midnight content theme**. It restores the original midnight shell and blue chromatic signature while keeping the premium light reading area that the project owner approved. A full, coherent optional midnight scientific-workspace theme needs its own content-level audit, visual snapshots, contrast evaluation, and verified interactions across Variants, Genotype, Evidence, Helios, Administration and Account. Do **not** flip all cards dark by applying global filters or modifying the original HTML.

The visual baseline must stay true to the original's functional density, quiet controls, connected research workflows, exceptional Class I evidence and five-modulator model. No simplification, scientific interpretation change, API changes, data writes or neumDESK edits.

## Acceptance

App starts without an extra network dependency. CI passes TypeScript, full browser smoke, connected five-therapy contract, original/functional parity and legacy integrity. Browser checks inspect the actual original electric-blue token, navy sidebar, quiet button background/border and keyboard/mobile navigation at 360px width.
