# 14H167 — Experimental endpoint provenance and comparability

The independently reviewed neumuacFQ source claim now includes a **structured
source-reported endpoint**. This is part of the immutable claim revision, so
two different reviewers approve both the qualitative source interpretation and
the exact extracted measurement. The existing variant treatment classifications
and the five historical genotype rules are unchanged.

## Endpoint schema
- Source measurement: sweat chloride, ppFEV1, CFTR-mediated chloride current,
  organoid forskolin-induced swelling, other, or explicitly not extracted.
- Study statistic: absolute level, change from baseline, relative change,
  ratio to control, or not reported.
- Source unit: mmol/L, percentage points, %, µA/cm², source-specific,
  ratio, or explicitly not reported.
- Biological model: clinical, airway epithelial, organoid, cell line,
  other, or not reported.
- Comparator: baseline, placebo, vehicle, untreated, wild-type, other,
  or not reported.
- Explicit timepoint as printed by the source. The number is preserved
  verbatim, **not** converted into a calculated effect.
- A missing measurement is represented as an explicit null rather than zero.
  Historical claim revisions with no endpoint retain null.
- Unit/statistic pairings are constrained in both the RPC and browser decoder.

## Research logic
Only independently twice-reviewed claims feed the research intelligence
engine. Numerically reported endpoints are grouped **only by identical**
source scope, genotype pair, study method, measurement type, reporting statistic,
unit, biological model, comparator and timepoint. Unspecified or nonstandard
context cannot support a comparative grouping.

The engine exposes source values, row counts and independently represented
study families. **It does not average observations, compute effect sizes,
generate probabilities, convert experimental results to efficacy, or recommend
treatment.** Observations originating from the same paper do not count as
independent confirmations.

## Data protection
- Migration `docs/sql/14H167_source_endpoint_context.sql` adds a validated
  JSONB measurement column to the existing private-schema claim revision.
- Only the existing authenticated, live membership / two-reviewer RPC can
  create or independently approve a new measurement. Direct table grants remain
  revoked and row-level security remains enabled.
- Existing published classifications, historical evidence flags and review
  decisions are untouched. No source values were synthesized or backfilled.

## Tests and acceptance
- Valid/invalid source units, missing values, absurd and nonfinite numbers,
  mismatched assays and study models, repeat study families, and strict
  no-pooling comparisons are covered in Vitest.
- Real-source form behavior and approved endpoint disclosure are exercised
  through isolated phone/desktop browser contracts.
- Check TypeScript, full regression, build, legacy parity and database
  permissions before release.

A validated quantitative prediction model would require a separately approved
dataset, endpoint harmonization methodology, statistical design and external
clinical validation. This phase is *measurement provenance*, not prediction.
