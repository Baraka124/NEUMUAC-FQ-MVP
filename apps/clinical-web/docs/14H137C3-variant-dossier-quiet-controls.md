# 14H137C3 — Variant discovery and scientific-dossier control proportions

## Visual reference and preservation
Use the owner's **untouched** original `index (85)(1).html` as the historical identity: notably original quiet `.btn-secondary`/`.btn-ghost` behaviors and its 34px visual `.btn-sm` (around original lines 3926–3955), electric-blue emphasis (`#2979ff`), fine borders and content-first density. We maintain **40px interactive control targets** where possible for a modern touch/keyboard interface instead of mimicking reduced hit areas.

The modular `Variants.vue` already has sophisticated capabilities: live server-scoped search, scientific notation guidance, named-variant aliases, all five advanced filters (class/subtype/ETI-or-Alyftrek response/sort/match mode), saved worklist, connected selected dossier, all five modulator-regimen research rows, exceptional Class I flags, contextual evidence and role-gated curation. **None are removed or simplified.**

## Actual component changes
- `Variants.vue` scoped presentation: shrink the 51px old discovery wrapper / 47px input to a **44px search wrapper / 42px input**, and replace green-tinted controls with original-electric blue, transparent surfaces and fine 6px outlines.
- Search help, clear action, Filters and Saved keep their full behavior/accessible name and roughly **40px** hit areas; avoid new filled pills and unnecessary oversized widths. Search, filter, saved and results status remain in the same compact rail.
- Scientific selected-record return path and section links remain connected and keyboard-focusable, using lightly bordered **40px** links instead of visually prominent pills. Save and Copy link remain 40px intrinsic-width outlined actions.
- Worklist result rows remain fully visible and selected/exceptional/recorded-class metadata remain independent. Only padding/minimum row height are adjusted.
- `VariantFilterPanel.vue` preserves **every original current setting and note**, with tighter 316px popover sizing, 40px selections/actions, reduced padding/shadow, and transparent Done/Reset. Retain Scroll/Escape/Done/Reset semantics and mobile constrained width.
- `midnight-workspace.css` explicitly reconciles rail search, filters and dossier actions with the original navy workspace. Scientific therapy classifications, response categories and evidence review statuses are not recolored.

## Verification and explicit limits
- E2E functional foundation: checks 320, 390, 768, 1024 and 1366 widths; input/button sizing, absence of filled CTA, popover full five-select structure, search help, no overflow and daylight/midnight mode with all advanced values, reset, reopen.
- Connected research fixture: verifies Class I exceptional label, five therapy rows, selected section focus, save/copy controls, responsive overflow and midnight contrast.

No original HTML changes; no Supabase mutation, new network calls, data modifications, class or therapy recalculation, role changes, invitation actions or neumDESK changes.

This is the next measured subphase, **not** a claim that all visual details are now perfect. Further 14H137C work is reserved for real-device inspection of popover layering, responsive dossier information density, Helios and Administration controls, and connected scientific navigation.
