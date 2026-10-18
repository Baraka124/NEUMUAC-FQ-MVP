# Geographic activity governance — development decision (2026-10-18)

**Status: requirements only; recording remains disabled until implementation and acceptance.**

- Public CFTR variant discovery remains anonymous; geographic activity logging must not run for anonymous users.
- Only signed-in accounts with verified email and an explicit admin permission may start a recording session. Do not use email as the session identifier; bind an immutable authenticated user ID.
- Each recording session has a unique server ID, owner, start/end times, immutable mode (`trial` or `production`), allowed regional scope, recording permission and status. Default mode is **trial**. Consent/transparency, retention and privacy review required.
- Geographic event collection is opt-in and server-authorized; require real, legible CFTR variant identity. Do not record patient geography, patient records, arbitrary search strings, precise IP-derived location or other PHI.
- Admin settings include global **off** switch, user authorization, trial/production permissions, ability to end sessions, review sessions and delete trial events. A deleted trial session must cease contributing to *all* materialized aggregates, historical snapshots and exports; retain only minimal actor/time/deletion audit metadata.
- Trial searches are isolated from production regional aggregates and must not later be relabeled as production. Production sessions require separately approved authorization.
- Users may export only their own permitted session activity, beginning with readable CSV and optionally a PDF summary. Admin exports require separate role controls; limit and audit exports.
- Do not presume existing historical geographic rows are verified research activity. Quarantine/label unattributed legacy events until their provenance is adjudicated.
- Read-only Geographic Atlas reference maps can remain available even while activity collection and analytics are disabled.
- Tests: unauthorized anonymous and signed-in denials, session ID binding, cross-user read/delete denial, production/trial isolation, deletion aggregate reconciliation, duplicate event deduplication, logout/session expiry, export limits, server-disabled collection and mobile UI.
- Admin-facing unavailable settings should show a clear lock and reason, rather than a fake active toggle.

Dependencies: review current database schema, actual collection call sites and role policies before implementation. **No production RLS or data modifications without separate reviewed deployment and privacy gates.**

## Phase 4F-13L–13M preflight (pure code, not event recording)

- The verified event classifier in `domain/variantQueryIntent.ts` requires a loaded matching dossier identity for a hit candidate; a miss candidate requires a deliberately committed, complete, unfiltered, successful zero-result search. Partial, stale, ambiguous, filtered, service-error and non-variant strings remain excluded.
- `domain/geographicEventGate.ts` separately requires explicit feature activation, authenticated/verified approved administrator, purpose/consent/retention, a server-authorized active session bound to the actor, a permitted trial/production mode, and an authorized session region unrelated to patient, IP or device location.
- The output is an **eligibility candidate for a future server check**, never an event, scientific conclusion, location lookup or authorization token. The current UI does not call this gate or write any geography; no server recorder exists in this phase. Server policies, approved aggregate privacy controls and deletion reconciliation are independent future requirements.
- An auto-open announcement must be conditioned on a successfully loaded selected dossier. Failed full-record reads must not be treated as hits or geographic observations.
