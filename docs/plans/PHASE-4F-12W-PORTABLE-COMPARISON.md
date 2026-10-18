# Phase 4F-12W — Portable two-record research comparison

**Parity:** NFQ-024 remains Partial. Reuses the existing `/genotype?a=&b=` record-identity route and permits copying it after **both** source records were actually retrieved. The comparison is not a patient genotype.

- Link contains only two canonical positive numeric recorded variant IDs in stable A/B order, no source-page query, browser context, email, region or patients.
- Clipboard success/failure is communicated accurately; incomplete or inaccessible records cannot be shared through the new control.
- Same-record A/B links are permitted but preserve the existing visible warning that duplicate record choice does not establish homozygosity.
- No clinical genotype, allelic phase, pathogenicity, evidence rating or treatment eligibility inferred.
- No backend queries beyond the existing read-only workflow, no storage, geographic event recording or database changes.
- Pure URL safety unit tests and disconnected narrow-screen browser checks included.
- Production acceptance still requires testing two real accessible variant records and clipboard permissions.
