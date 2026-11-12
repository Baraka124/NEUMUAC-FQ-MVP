# 14H137B — Optional original Midnight Scientific Workspace

## Design authority

The project owner provided the original `index (85)(1).html`; preserve it **untouched**. It contained both a deliberate midnight research interface and a distinct light theme (`html[data-theme="light"]`), not merely one dark background. Night: `#05091a`, `#0c1422`, `#0f1d30`, electric `#2979ff`, subtle blue borders and cyan details. Day: `#f4f5f7`, `#fff`, text `#162540`. Original secondary/ghost controls used transparent surfaces and restrained borders.

**This phase does not simplify any scientific or operational function.** The five therapy classes, historical evidence audit, exceptional Class I, validation chronology, source curation, permissions and review operations remain the exact same Vue components.

## Functionality

- Add `researchTheme.ts` and tests. `light` remains the safe default. A client-side preference is read from and written to the **FQ-only** localStorage key `nfq-research-theme-v1`. Storage failure leaves the current session functional, with no server calls.
- A calm 40px header control toggles the appearance, with explicit accessible labels and `aria-pressed`. On small screens, the switch appears within the existing mobile workspace menu **instead of consuming critical header width**.
- Apply the theme solely to `.app-frame[data-nfq-theme="midnight"]`. Public sign-in, activation and recovery experiences are excluded. No browser-wide `html[data-theme]` mutations; no CSS filters or universal color inversion.
- The midnight style sheet is imported **after** the original-chromatic light layer; semantic tokens and scoped components render navy surfaces, clear typographic hierarchy, visible evidence/reference metadata, subdued borders and contextual review details.
- Preserve the existing functional-class and other evidence-status distinctions; status colors are not remapped to a decorative palette.
- Keep active/focus/keyboard/mobile navigation in both themes and `prefers-reduced-motion` behavior intact. No new downloadable font or external dependency.

## Structural scope

| Area | Midnight coverage | Functional boundary |
|---|---|---|
| Institutional shell / workspace switcher | Midnight header and surface, original navy sidebar, blue-active navigation | Existing account state and routes unchanged |
| Variants / dossier / therapy | Selected variant, research surfaces, type hierarchy, connected research links | All five therapies and source fields unchanged |
| Genotype | Paired records, five-rule results, review details, disclosures | No inferred patient haplotype or eligibility |
| Evidence & Provenance | Record sheets, identifier observations, source curation, publication details | No source corrections or new writes |
| Helios | Worklist and restricted review surfaces | No activation or reviewer permission change |
| Administration | Profile, role/readiness forms, status and directory contrast | No role assignments or invitations sent |

## Acceptance / caveats

Automated browser contracts exercise desktop theme persistence, midnight light reversal, app route continuity, evidence/variant/genotype/Helios/Admin source presentations, 360px mobile menu and overflow, safe unknown storage and the existing functional-parity suite. Browser automation is **not equivalent to a manual visual accessibility review**: after deployment, contrast/focus and popovers across every authorized role and expanded state should still receive real-browser screenshots and user acceptance.

No changes to original HTML, FQ Supabase schema, authentication roles, clinical data, evaluation rules, source records, neumDESK or production deployment.
