# Phase 4F-12U — Evidence & Curation view links

**Legacy parity:** NFQ-009 (Partial), NFQ-038 (Partial). This recovers shareable context for the real, read-only evidence register; it does not imply that a reference is verified or that the current page is a complete source dossier.

- Copy view link captures the currently selected evidence-search term, zero-based page and/or canonical variant scope through the existing validated `workspaceJourneyPath`.
- Reconstructed HTTP(S) links include no existing hash browsing history, root query parameters, user identity, geolocation or patient data.
- An unsupported search filter disables sharing instead of generating a misleading link.
- Clipboard denials report failure; a successful copy is described as a *view link*, not an evidence validation.
- Existing paginated evidence reads, source provenance, search/filtering and server access controls are unchanged.
- No database writes, synthetic scientific records or geographic event logging.
- Unit and browser tests cover safe filters, variant scope, invalid characters, narrow viewports and no horizontal overflow.
- Production acceptance of clipboard support and live record source access remains outstanding.
