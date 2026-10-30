# Phase 14H17 — Five-therapy clinical usability and interaction refinement

NFQ-024 and NFQ-038 remain **Partial** pending verified live clinical acceptance.

## Delivered

- On selection of a second real variant, reveal the five-regimen research comparison when it would otherwise open below the viewport. Respect reduced-motion preferences.
- Present a compact, in-context **View therapy comparison** control after both real variant records are loaded, including for restored deep links.
- Focus the destination heading for keyboard/screen-reader users; **Edit variants** returns focus to the first search field.
- Show an actionable **Retry** for failed variant lookup/restore rather than an orphan error message.
- Keep the comparison entirely absent until two actual selected records exist. No demo records, synthetic predictions, duplicate large cards, or scientific mutation.
- Retain 320/390/768/1366 px responsive containment checks, with an opt-in live production interaction acceptance test.

## Pending verification

Production screenshot/interaction review on fq.neumact.org, including authentication, data API availability, desktop/mobile visual acceptance and clinician evaluation, remains separate from GitHub CI. Do not mark scientific or end-to-end functional parity complete on the basis of a design merge alone.
