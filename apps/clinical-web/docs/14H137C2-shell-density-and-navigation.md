# 14H137C2 · Research shell proportions (sidebar and header)

## Starting point

Continue the owner-directed original-to-modular project. The source of visual identity remains the owner's untouched original `index (85)(1).html` and the previous checked-in original-signature and optional midnight themes. **We are not simplifying scientific features.**

14H137C fixed the wide search form and filled green search action (PR #318). This follow-up inspects the shared Vue shell without touching route handlers, scientific modules, local history or authentication.

The older `styles.css` rules still reserved **77px minimum wordmark height plus 26px bottom margin** and a workspace launcher of approximately **194px**, despite the existing premium compact design. The sidebar list already supports collapsed navigation and keyboard labels; those features should not be replaced.

## Implementation

The research shell's existing design source, `src/original-signature.css`, now adjusts **named shell elements only**:

- Logo/wordmark min-height **61px**, gap **14px**; 36px visual mark, modest label and caption spacing. No logo asset altered.
- Sidebar navigation entries remain **at least 44px high** for usability, but use 9px/10px padding, 12.5px typography and a quieter 6px corner. Sidebar scroll, account entry and access footer remain reachable.
- Collapsed sidebar retains centered icons, accessible labels, independent collapse control and content width. Edge toggle is **38px** rather than a visually swollen control.
- Workspace launcher is **155px maximum** on wide desktop with a transparent fine-bordered presentation and a preserved `Ctrl K` affordance. At 761–1000px it becomes **58px** with the shortcut visible; at mobile widths it remains **44px**. All retain `aria-label` and keyboard shortcut semantics.
- The existing header environmental status can truncate **visually** when space is scarce, while its data, status role and independent main-panel notice remain unchanged. No information is deleted or reinterpreted.
- The original midnight background/blue emphasis and light mode both retain the same quiet control semantics. No global style resets, no extra network requests or font assets.

## Functional and responsive acceptance

A browser contract spans 1366px, 1024px, 820px, 768px and 390px, checking spacing, minimum navigation hit height, compact launcher, no horizontal scrolling, collapsed/expanded navigation, `Ctrl K` opening, Escape closing, theme switching, and successful mobile navigation to genotype.

This is **not** a cosmetic replacement for the other modules. Remaining 14H137C inspection: the variant search rail, individual scientific details, pair comparisons, evidence/Helios toolbars, administration/editor controls and authorization-specific responsive states should be assessed in their own components rather than with broad CSS overrides.

**No original HTML overwrite; no data/schema, therapy evaluation, Supabase roles, neumDESK, invite, sign-in or production deployment changes.**
