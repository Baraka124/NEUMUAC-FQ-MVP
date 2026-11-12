# 14H137C · Search proportions, quiet controls, and scientific workspace density

## Reported visual issue

The project owner supplied two screenshots showing the research overview's **Search CFTR variants** area. The single-line search extended nearly across the full available application width, while the submit action was a wide, solid green button. This contradicted the owner's original premium UI philosophy: dark/light visual identity, slender controls, calm outlines, and modest, purposeful sizing.

The immediate root cause was in `Overview.vue`:
- `.nfq-home-search-controls input` had `width:100%`, `flex:1 1 auto`, and `min-height:52px`.
- The action used `min-height:52px`, `padding:12px 18px`, and `background:#185a42`.
- The search region could expand across a 1020px page container, with a broad field/button row.
- The overview's static green/white styles were not reconciled with the newly established original midnight scientific theme.

## Implementation

14H137C changes **only presentation styles**, not the form structure or the `openVariantSearch()` handler:

1. Limit the overview content width to 880px, the search panel to 780px, and the search controls row to **640px**. The field receives the remaining width, rather than filling the entire workbench.
2. Bring the input to **42px** and the action to **40px**. Maintain keyboard and pointer usability; the action stays visibly distinct through a fine border and original electric-blue typography.
3. Remove the heavy green fill. Use transparent/white surfaces, modest horizontal padding, a `6px` radius, calm blue hover and explicit `:focus-visible` state.
4. On narrow displays, stack the controls but keep the action **intrinsic width and left aligned**, not a full-width slab. Preserve the useful placeholder, accessible label and ordinary Enter-to-search semantics.
5. Add explicit corresponding midnight colors for search panel, input, status, links and button instead of relying on global inversion. No semantic CFTR class/evidence indicators are recolored.
6. Preserve all original search destinations, filters, query state, clinician permissions, variant results and connected research navigation.

## Regression gates

Add automated Playwright coverage at **320, 390, 520, 768, 1024, 1366 and 1600px** to check maximum component widths, roughly 40–42px control heights, clear button borders, transparent button fill, absence of horizontal overflow, and intact `R117H` query navigation. Check dark-mode surface/field/action colors and the return to daylight.

A screenshot-based visual review in the eventual deployed environment remains important; passing CSS geometry tests alone does not prove the subjective experience is at the desired level.

## Further 14H137C audit, still separate work

Apply the same measured, source-grounded scrutiny to:
- Variant search rail, filters, actionable scientific rows and dossier disclosure density.
- Genotype pair comparison widths, paired review flags and compact source explanations.
- Evidence/Helios actions, expandable panels and admin roster/editor controls.
- Responsive sidebar, popovers, sticky areas and focus states across authorized roles.

These areas should be changed **on evidence from their actual components**, not by a blanket global CSS override.

**No original HTML overwrite; no database, Supabase roles, authentication, clinical values, scientific algorithms, or neumDESK modifications.**
