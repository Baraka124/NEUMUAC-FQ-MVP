# 14H145 · Connected recorded-activity reports

## Purpose

Turn the reserved /reports route into a genuinely usable and restrained
Reports & Audit research workspace. Preserve the V7 original visual signature,
small outlined controls, responsive phone interaction and optional Midnight
palette. This is a bounded recording-review tool, not an immutable clinical audit.

## Verified inputs and scientific boundaries

- Accept a single positive variant record ID (1–18 digits) or a **single,
  unambiguously exact** recorded variant name; do not infer ambiguous aliases.
- Read the variant from the existing read-only catalog source. Read its
  validation_history and contradictions from the existing single-variant
  historical research adapter. No new endpoints, schema, RLS assumptions or
  database writes.
- Reuse recordedResearchChronology: it fails closed for invalid timestamps,
  duplicate events, cross-variant data, logically inconsistent resolution and
  unsupported/incomplete event sizes. Dates are normalized to UTC; undated
  events stay separate.
- Show the actual counts of validation **entries**, conflict **records** and
  currently marked unresolved conflict records. No independent-validator
  assertion, global completeness, severity/priority ranking or clinical
  interpretation.
- If record lookup or the complete historical register is denied, invalid,
  missing or unavailable, show status and no partial timeline or counts.
- Link back to the selected variant dossier and variant-scoped recorded
  evidence catalog. The dossier also links forward to this report.
- Export only the successfully loaded chronology as a bounded, CSV-formula-safe,
  variant-scoped CSV (maximum 600 rendered event rows). No clinician names,
  personal accounts, notes, arbitrary source snapshots or patient metadata.
  The export cannot imply an authenticated audit certificate.
- Navigate from the normal research sidebar and Ctrl+K workspace switcher.
  The historical placeholder route is removed, but Governance remains planned.
  The latest accepted V7 original JavaScript/scientific logic is untouched.

## Acceptance and visual contract

- Unit tests for CSV formula safety, date completeness, scoped identity,
  empty results, duplicate keys and event count limits.
- Browser contract uses intercepted deterministic read-only test records under
  cftr-contract.invalid; no external Supabase calls. Includes full 3-request
  variant/history flow, filters, downloadable CSV, source denial and
  cross-variant history rejection, cleared context, desktop/mobile containment,
  16px phone inputs, original Midnight surfaces and GET-only requests.
- Fixture-free smoke verifies the reports route is real, public entry remains
  unaffected and the 320px / 390px / 768px / 1366px layouts do not overflow.
- Preserve all existing five-therapy/ETI/Alyftrek, original exceptional Class I,
  reference and review authorization, RLS, evidence curation, research role
  verification, page-scoped exports, legacy integrity and non-deployment gates.

## Explicit limitations and next capability

This workspace is **not** yet a cross-variant institutional reporting service,
patient report, regulatory audit, signed review journal, PDF report or aggregate
decision dashboard. A future governed report system would require a dedicated
read contract with source completeness, scope, independently verifiable actor
and authorization metadata, and corresponding clinical governance.

No neumDESK, Supabase, Railway, external identities or production data changes.
Do not merge/deploy before full clinical browser and scientific CI acceptance.
