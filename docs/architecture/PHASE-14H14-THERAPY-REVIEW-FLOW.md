# Phase 14H14 — Five-therapy evidence and review continuity

**NFQ-014/015/018–023/025/026/038.** This phase restores the usability path from a modulator response to evidence inspection and review preparation without presenting a non-operational approval UI.

## Delivered

- The five-therapy workspace exposes relevant Class I review prompts when there is an unflagged Class I ETI response, exceptional-subtype disagreement, or a difference between recorded ETI and Alyftrek response. It does not invent clinical findings.
- A concise on-demand review panel contains only the relevant prompts, links to the existing record-scoped Evidence & Curation view, and opens the real dossier's Sources & Validation section with focus and scroll.
- Users can download a deterministic Markdown review brief for the selected exact variant containing all five regimens, independent response values, evidence fields, class/subtype, validation count, and any review prompts.
- There is no fake submit, approver assignment or local-only acceptance masquerading as database review. Backend authorization, review decisions, corrections and immutable audit are still not completed in v2; Helios operates as a read-only queue where connected.
- Unit regression covers class-I drug divergence, exceptional subtype, missing-response separation and malformed review packets. Opt-in live Playwright acceptance checks original records #35 (ETI/Alyftrek divergence) and #1 (exceptional Class I ETI response).
- UI remains a single responsive scientific dossier, with one five-row list, optional evidence details and a single review disclosure. No colored duplicate cards or additional navigation steps.

## Boundaries

No clinical treatment recommendations, automatic reclassification, RLS changes, server writes, unlocked Helios approval, paid staging or geographic hit/miss telemetry.

Next: an authorized, auditable reviewer write endpoint and a clinician production acceptance pass must be verified separately before announcing true end-to-end review submission parity.
