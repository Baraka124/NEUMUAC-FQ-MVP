# 14H152 · Fresh source-backed saved-variant research snapshot

## Why this phase exists

The original archived application exposed saved variants and an export carrying
scientific metadata. The modular system correctly restored browser-local saved
identifiers, portable links and verified dossier reopening (4F-12R/12S), but
the recorded-label/class export remained deliberately missing. Saving historical
labels to localStorage would make them stale and potentially misleading.

**Affected parity:** NFQ-007 (scientific dossier), NFQ-038 (responsive saved
worklist), original capability V04; all remain **Partial**. This does not
implement NFQ-031/032 scientific dossier reports.

## Implementation

- Keep existing `Export links · CSV` unchanged; it works without live access.
- Inside the same saved disclosure, add one compact `Export current records · CSV`
  action and an unobtrusive contextual `(i)` explanation. No new main menu,
  viewport-consuming panels or dominant filled buttons.
- On explicit click, independently GET each currently saved canonical ID (1–18
  decimal digits, max 40) from the existing authorized `RealVariantSource.get`.
  Concurrency max 3, AbortSignal cancellation on panel close or worklist change,
  no implicit full-catalog lookup, no source mutations.
- Require all fetched records to match requested IDs and contain trustworthy
  recorded nomenclature, optional recorded class/subtype and separate ETI and
  Alyftrek fields. Reject inaccessible, missing, malformed or mismatched
  entries; **never export a partially refreshed scientific subset**.
- Export a local, bounded, formula-neutralized CSV with the recorded name,
  protein/cDNA notation, recorded class/subtype, separate ETI/Alyftrek metadata,
  recorded validation count, canonical direct record URL, and export UTC time.
  The retrieval time is **not** an evidence update timestamp.
- No identity, accounts, search terms, bookmarks persisted with scientific
  metadata, geographic history, background activity, fake production records,
  patient data or server-side report generation.

## Clinical, authorization and scope boundaries

All fields are database-recorded, not independently clinically adjudicated.
The export does not calculate response, compare evidence levels, determine
therapy eligibility, score publication quality, certify reviewer activity,
or infer a genotype. No adjustment to five-regimen logic, Class I exceptional
rules, source citations, permissions, invitations, Helios, genotype, Supabase,
Railway, neumDESK or original `index.1.html`.

## Acceptance

- Domain units: canonical ID validation, duplicate/over-limit rejection, three
  concurrent GETs maximum, cancellation, strict identity and nomenclature
  checks, fail-closed incomplete output, CSV formula safety and origin stripping.
- Contract browser: save two independently retrieved variants, reload, export
  fresh recorded fields with verified canonical IDs, ensure no API write and
  no horizontal overflow under Midnight at 390px; retain original links CSV.
  An unavailable saved record must block the entire current-record CSV.
- Existing Vue typecheck, Vitest, clinical browser/smoke, five-therapy connected
  contracts, full migration/differential, release guards, original functional
  parity and frozen legacy integrity must all pass. Real-catalog browser
  acceptance and research-team signoff remain independent requirements.

**Dependency:** stacked on 14H151 (PR #336), which itself is not yet merged
into production. No production deployment should be inferred from this PR.
