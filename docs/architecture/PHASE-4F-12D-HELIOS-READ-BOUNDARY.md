# Phase 4F-12D — Helios published review boundary

**Status:** Contract only. No live reads, backend endpoints, reviewer identity exposure, approvals or writes.

The connected Cystic Fibrosis Supabase database currently grants anonymous SELECT access to its Helios review tables, alongside permissive write policies documented in Phase 11J–11L. This does **not** make raw Helios records suitable for the public UI.

A future read API must independently establish caller authorization and return a narrow, reviewed projection with recorded value, proposed value, evidence summary, uncertainty and approved source references. It must not transmit raw `discussion`, `claimed_by`, `reviewed_by`, audit identity, internal reasoning, patient context or private workflow metadata by default. The frontend's `decodePublishedReview` only validates/whitelists an already supplied payload: **it is not an authorization mechanism or a guarantee that unauthorized material was not transmitted over the network**.

**Acceptance gates:** production/staging identity verified; restrictive server-side policies; role-specific denial tests; authorized projection endpoint with auditable access; source/link verification; explicit empty/denied/error states; no synthetic records; no automatic decisions; responsive and keyboard-usable presentation. Do not call raw `helios_pending_review` from public Vue. Phase 12C's truthful unavailable state remains until the gates are satisfied.

11G–11L security requirements remain in force and scientific approval is separate from technical authorization.
