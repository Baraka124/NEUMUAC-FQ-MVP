# Phase 4F-12V — Visible-page recorded evidence export

**Legacy parity:** NFQ-009 Partial, NFQ-031 In progress, NFQ-032 Not migrated.

The evidence register can export **only the currently loaded page** as a UTF-8 CSV. This is a portable list of database-recorded reference identities and citation fields, not a full scientific dossier.

- Export is offered only after a successful read with one or more visible records; disabled/unconfigured/error states produce no export control and no fake entries.
- Export includes reference ID, variant ID, source label, recorded title, recorded year, journal, PMID, DOI and the repository-validated HTTPS source URL. Recorded evidence quality scores, pharmacology and clinician recommendations are intentionally omitted.
- CSV uses UTF-8 BOM, quoted escaping, normalized line-break/tab whitespace, and apostrophe-prefixed spreadsheet-formula-like values. Duplicate IDs, untrusted variant IDs, insecure URL schemes, empty pages and pages larger than the service's 30-reference limit fail closed.
- The filename explicitly identifies the exported page number; UI labels and feedback state **current page only** and the lack of independent scientific validation. There is no suggestion of complete corpus export.
- The export is a user-initiated browser download. It performs no additional data requests and no write, analytics, Atlas activity or user/patient-location capture.
- Tests include independent unit checks for CSV boundaries and spreadsheet injection, plus browser checks for disconnected/empty state at mobile/tablet/desktop.
- Pending production acceptance: validate the exact CSV with current authorized reference data; confirm source URLs, source provenance, browser downloads and pagination. This is not a PDF clinical report or immutable archive.
