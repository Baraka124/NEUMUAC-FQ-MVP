# 14H138A · Screenshot-driven search, Midnight surface and original logo fidelity

## Reported issues

The owner supplied screenshots showing search controls that felt disproportionate, research regions appearing cloudy or white despite selected Midnight theme, and a brand emblem that does not fill the sidebar area. These are presentation defects in a scientific research platform that must maintain the full original capabilities, not justification for simplifying the workspaces.

The original monolithic `index (85)(1).html` remains untouched. Its deliberate original-night palette, original-electric blue `#2979ff`, and restrained control proportions remain the design reference.

## Concrete source-level causes

- The overview's `nfq-home-search-controls` had a 640px maximum even after the prior reduction, and evidence search allowed 680px; Genotype's paired inputs allowed 470px and Research Coverage had no consistent search-instrument maximum.
- Legacy `styles.css` still defines light green/white surfaces for `.discovery-help`, `.discovery-pagination button`, `.genotype-suggestions`, `.nfq-science-clear`, `.nfq-coverage-groups button` and empty documentation states. Midnight had partial coverage of scientific containers but not these nested and transient search experiences.
- Desktop sidebar brand presentation used a 36×36px image inside the more generous wordmark region. The image uses original supplied PNG, which is not modified.

## Implemented

- **Bounded searches**: Overview 560px max, Evidence 560px max, Genotype input/suggestions 420px max, and Research Coverage 560px max. Minimum 40–42px control floors and responsive wrapping preserved. No search logic, query, fetch or registry change.
- **Quiet controls**: Evidence Clear, genotype Clear, and coverage Clear use transparent 6px fine-bordered buttons, original-blue focus/hover and naturally sized action text.
- **Midnight parity**: search inputs, search guidance, notation feedback, pagination, suggestions, coverage group buttons, empty results and evidence scope actions use the original night semantic tokens (`#05091a`, `#0f1d30`, `#111f33`) instead of pale/smoggy cards. All clinical status and functional-class colors retain independent meaning.
- **Daylight clarity**: source search help uses clean ice-blue `#f7faff` with original-blue contrast rather than pale green-gray. Suggestions and empty states are opaque crisp white.
- **Brand fill**: desktop sidebar emblem gets a 44×44px slot with a small 1.09 presentation-only zoom; `object-fit:contain` and original aspect ratio are retained. The image file and the accompanying text are unchanged; collapsed navigation remains centered.

## Browser acceptance

`clinical-foundation.spec.ts` asserts actual DOM/CSS geometry, real logo image load/fit and scaled width, four search surfaces across desktop and narrow mobile, no document-level overflow, and real computed dark-to-daylight background transitions in all four research workspaces. Existing full clinical browser suite, connected five-therapy contract, original scientific parity, legacy-integrity and deployment guard are mandatory before merge.

## Important production boundary

An application branch or green tests cannot prove the latest style is on **fq.neumact.org**. Current Vercel team access is not authorized, and external public browser inspection has not confirmed the site's live commit. This branch makes no live deployment, migration, permission, email, invitation or scientific record change. Once platform authorization is available, compare live release marker with the merged commit and inspect relevant full-screen screenshots under Daylight and Midnight.

The separate 14H138 release identity/provenance work is **not overwritten or silently merged into this visual fix**.
