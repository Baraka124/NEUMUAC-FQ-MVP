# Phase 4F-13B — Recorded dossier chronology

**Legacy recovery:** NFQ-021 remains Partial. The existing Variant dossier Review history disclosure now presents existing read-only validation and conflict metadata as one recorded chronology, using the domain contract merged through Phase 13A.

- One compact newest-first list includes dated validation events, conflict detections and recorded resolutions as separate events. A resolved conflict is not retroactively treated as resolved on the date it was detected.
- Events without recorded timestamps appear in an explicitly **undated** collection that is not chronologically ordered. Every displayed dated timestamp is UTC-normalized; the original source date is preserved in the time element.
- A malformed, mismatched, repeated or temporally impossible record causes a truthful inconsistency message instead of a partial timeline. Empty and unconfigured histories remain distinct.
- The existing source read and redaction boundary is unchanged; actor identity, notes, institution, patient context and raw contradiction details are neither fetched nor displayed.
- No proposal/reviewer actions, database writes, independent integrity attestation, expert-scientific validation, medical treatment inference, or geographic activity logging.
- Browser checks confirm that disconnected views cannot invent historical events or actions and remain responsive. Dated/undated sort and integrity behavior are covered by 13A unit tests. Deployed live-record acceptance and audit governance remain outstanding.

No new workspace or sidebar destination. The chronology remains within the existing dossier, behind the same disclosure.
