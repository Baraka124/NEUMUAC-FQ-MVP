# neumuacFQ · Editorial E03 — Full-system coherence and freeze gate

## Scope and baseline

This is the final scoped visual integration of the existing clinical Vue application after E01 and E02. The scientific research changes in PR #382 are already merged; **this PR contains only presentation-layer CSS, presentation tests and documentation**. No therapeutic eligibility, CFTR gene interpretation, study evidence, permissions, authentication, research workflow behavior or legacy HTML is modified.

## E03 changes

- **Launcher/dialog:** compact search and close affordance, consistent focus and typographic hierarchy, restrained border and shadow, phone-width safety.
- **Contextual information:** consistent help summary/panel presentation and readable research explanations; no forced persistent panels.
- **Variant/evidence lists:** coherent item typography, quiet separators and focus-visible keyboard affordances.
- **Audit/administration:** tighter event chronology, secondary heading rhythm, reduced ornamental borders.
- **Comparison and geography:** predictable max-width behavior for inputs and secondary panels without reinterpreting scientific data.
- **Responsive and accessibility:** 760px and 400px layouts, reduced-motion handling, focus-visible indicators, bounded secondary surfaces.
- **Theme fidelity:** retains the exact established institutional navy (#0C1422), daylight canvas (#F4F5F7), midnight mode, its stored preference, and transparency of variant utility filters.

## Freeze criteria (must be satisfied; not asserted by this document)

1. All GitHub CI workflows pass on the final E03 commit: Vue/TypeScript/unit checks, all clinical browser shards, five-therapy connected contract, functional parity, legacy integrity and non-deployment guard.
2. Compare desktop and phone renders, including opening filters, launcher, help and record/dossier details, at 320px, 390px, 768px, 1024px and 1366px. No unexpected overflow or inaccessible actions.
3. Verify light/midnight state is restored after route changes and page reload.
4. Verify focus-visible, high-contrast actionable text, hover/pressed/disabled states, reduced-motion and keyboard close/focus of dialogs.
5. Check that reviewer/evidence status colors, ETI/Alyftrek responsiveness, mutation class semantics and the original index.html remain unchanged.
6. Record a human UI review and resolve any remaining Playwright failures **without weakening tests for existing protected contracts**.

When complete, label the milestone **Editorial v1 — frozen**, merge E01–E03 together, and make future visual changes only against a documented defect or new product requirement. Do not state visual acceptance before a viewport inspection is performed.

## No production scientific deployment

The proposed authenticated CFTR expert reference registry migration remains intentionally **undeployed** pending isolated staging and independent scientific verification. An editorial UI merge cannot serve as scientific validation.
