# 14H160 · Recovery of original gnomAD population-reference contract

## Authority and source

**Primary source:** the user's 16 November 2026 upload `index (86).html`,
SHA-256 `5c7dce0258cf2ba4191c9eff0781ee3d02886b9e026b078e1fb51601f42fe9c5`.

Relevant original functions and line anchors:
- `_buildGnomADId` (8188), `fetchGnomADFrequency` (8201),
  `enrichWithGnomAD` (8234).
- `fetchGnomADPopulationFrequencies` (8311),
  `renderPopulationFrequencyPanel` (8388),
  `loadAndRenderPopulationFrequencies` (8448).
- `cfsmFetchData` (14573), `cfsmHighlightVariant` (15363),
  `_inferVariantPopulation` (14980), `heliosRunGeoSignal` (33691).

These last four are **not gnomAD reference frequencies**. They operate on
search or inferred geographic context and must never be conflated with
genetic reference populations or patients. The archived GitHub
`index.1.html` is a different revision and remains a secondary reference.

## Evidence audit of the original code

The legacy code contains useful intentions but cannot be transplanted as-is:

1. It interpolates `variant_id` directly into GraphQL query text. The
   current documented public variant query uses `variantId` and a
   parameterized `variables.variantId` value. This phase uses a static
   GraphQL document with a validated variable. Confirmed from the
   upstream gnomAD browser GraphQL README:
   https://github.com/broadinstitute/gnomad-browser/blob/main/graphql-api/README.md
2. The original falls back from a genomic coordinate to an rsID, cDNA
   nomenclature, or protein name. Those strings are not guaranteed to
   identify **one specific alternate allele and reference assembly**.
   This phase accepts only an explicit GRCh38 chr7
   `7-POS-REF-ALT` identifier; absent source verification means
   **no request**, not a guessed coordinate.
3. The original silently prefers the genome callset when present, then
   falls back to exomes. This phase keeps **genome and exome counts
   separate**. `ac`/`an` must be safe, nonnegative integers with
   `ac <= an`, and `an=0` is not represented as AF=0. Mismatched
   upstream AF or variant identity/assembly fails closed.
4. The original labels frequency cutoffs as `BA1` and `PM2` and,
   under browser write-mode, silently PATCHes `population_frequency`
   into the clinical catalogue. This phase does **neither**.
   Clinical classification requires variant/disease-specific and
   versioned interpretation by the scientific team, not an unreviewed
   single frequency rule.
5. Legacy population-to-geography prose and `_inferVariantPopulation`
   suggest geographic locations from ancestry categories. These are
   not direct observations of where patients or variant carriers
   reside and must not generate maps or prevalence claims.
6. Legacy `geo_search_enriched` and `search_logs` records include
   institutional/location context and are unrelated to public
   reference allele frequency. No such record is accessed here.

## Implemented now

A pure decoder and explicit-call read-only transport live at
`apps/clinical-web/src/domain/gnomadPopulationReference.ts`:

- Exact dataset `gnomad_r4`, assembly `GRCh38`, fixed official
  HTTPS GraphQL endpoint, explicit single-allele request.
- Count-validated genome/exome observations; population IDs retained as
  raw gnomAD grouping codes with `ac`, `an`, source-derived AF.
- Separate `not-found`, `no-coverage`, `unavailable` and `available`
  states with no fabricated filler; erroneous data fails closed.
- No automatic network calls, no patient context, cookies, credentials,
  Supabase writes, local state mutation or automatic ACMG rules.
- Test-only transport fixtures for identity, assembly, invalid input,
  missing denominators, inconsistent AF, HTTP/error, cancellation and
  correct request-variable handling.

**No user-facing gnomAD results are enabled in this phase.**
The current Vue `RealVariant` public catalogue does **not** expose
independently verified genomic coordinates, so a direct per-variant
association would be speculative. This is a testable science-domain
foundation, **not complete NFQ-013 migration or clinical acceptance**.

## Next gated user-visible step

In the next narrow phase, verify the authorized record schema/GRCh38
source first (without adding columns or modifying RLS). Only after
record-to-coordinate identity is independently validated, add a
small on-demand **Population reference** section in the source
dossier. The source row must show the official gnomAD identifier,
dataset/assembly, separate exome and genome `ac/an/AF`, and a direct
source link. On missing/mismatched coordinates show an explicit
unavailable message; never ask the model to guess allele position.
Keep it distinct from the Geography atlas and research search demand.

Acceptance needs a true source API smoke test, a clinician review of
terminology, a role-safe read policy and real-data acceptance in
addition to TypeScript/unit/browser CI. Do not automatically make
`BA1/BS1/PM2` or treatment statements.
