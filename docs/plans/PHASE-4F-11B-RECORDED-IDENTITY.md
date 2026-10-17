# Phase 4F-11B — Recorded identity before normalized search

**Legacy source:** Frozen `index.1.html` Git blob `c18221fb6baf47782318ca3685b94b088c359a66`; `normaliseQueryWithSteps` begins near L13129. Read against modern `compoundDiscovery.ts`, `searchPresentation.ts`, `instantMatch.ts` and `liveVariants.ts`.

## Original creative capabilities worth retaining

- Informal variant names and eponyms via an explicit legacy mapping, rather than freeform language-model guesses.
- Positional shortcuts such as 508 and 551; in the old code the position maps straight to a single mutation, **but a position alone is not a unique molecular variant identity**.
- Short naming conventions and amino acid substitutions such as `DeltaF508`, `Phe508del`, stop/termination aliases.
- Nomenclature transformations and compound search with per-part matching.

## Safety qualification, not feature retirement

- Position `508` may describe more than one CFTR alteration; never automatically open a single dossier without an authority-backed exact mapping and ambiguity check.
- Legacy rewrites strip prefixes, parentheses, and deletion sequence suffixes; such transformations can erase scientific distinctions. Do not apply them blindly to accession-qualified HGVS or uncertain/phased input.
- Legacy informal mapping (e.g. local nicknames) is a discovery suggestion only until a curator explicitly links it to a real variant record, with source and version where appropriate.
- To promote a synonym: establish a precise authoritative mapping to a recorded canonical ID; require ambiguity handling and evidence/source status. If evidence is insufficient, show candidate discovery or contextual explanation rather than selecting a record.

## Implemented in 11B

`RealVariantSource.get` now accepts only canonical positive decimal record IDs, matching record decoding and dossier identity. Previous permissive `[a-zA-Z0-9_-]` URL input could dispatch a backend request for non-identifiers, even though decoded records must have numerical IDs. This change is read-only, rejects malformed IDs before network activity, and does not change existing alias searches, exact-match discovery or any UI. Add regression coverage for invalid IDs and a real canonical record lookup.

**What remains for 11B/11C:** source-verified mapping inventory, exact stored-alias acceptance with provenance metadata, and user-facing ambiguity explanations. No historical alias or position shortcut has been activated automatically in this increment; NFQ-003–006 remain partial.
