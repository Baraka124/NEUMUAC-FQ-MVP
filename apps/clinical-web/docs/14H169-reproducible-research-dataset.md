# Phase 14H169 — Reproducible, approved-source research dataset

## Scope
An on-demand **research-only snapshot** of currently approved, independently
twice-reviewed scientific observations from the existing versioned claim register.
No source metadata is automatically treated as verified clinical evidence.
The original five-therapy recorded classifications and genotype response rules
are not modified. Nothing is fabricated, trained, imputed or predicted.

At deployment preparation, the CFTR database has **zero approved source claims**.
A valid empty snapshot (with a version, empty JSON records and CSV schema) is
therefore the correct live output, not a launch failure.

## Data contract and reproducibility
- The PostgreSQL RPC `nfq_approved_research_dataset()` verifies the current
  authentication session and active research membership **for every request**.
- Snapshot creation is read-only. Server verification requires an exact linked
  variant/reference, precisely two distinct independent approvals excluding the
  submitter and no rejected review, plus valid endpoint fields when present.
- A malformed or incomplete snapshot fails closed: no partial record set is
  silently exported. The complete snapshot is bounded at 1000 approved rows.
- Claims have exact revision, series, variant, therapy, source bibliography,
  source locator, study-family identity, scope, genotype pair, method, qualitative
  finding, structured measured endpoint and review timestamp. No researcher email,
  reviewer identity, user account metadata, patient data, passwords, raw notes,
  unapproved claims or review justification are exported.
- A SHA-256 digest of the canonically ordered PostgreSQL JSONB record set
  identifies source-content versions. The generation timestamp is separate,
  so reloading unchanged records does not change the fingerprint.
- Exports: JSON with manifest, limitations, quality flags and raw approved
  source values; CSV for quantitative research software with explicit missingness,
  numeric signs and units preserved, and escaped formula-like text cells.

## Quality assessment
The browser performs descriptive *research readiness* classification only:
- Unextracted endpoint / historical empty endpoint
- Qualitative observation without a numeric measurement
- Nonstandard/incomparable numeric measurement
- Context-bounded numeric measurement with explicitly reported outcome,
  statistic, unit, assay model, comparator and timepoint

Comparability keys include **variant, therapy, biological scope, genotype pair,
study method, measured endpoint, statistic, unit, model, comparator, and timepoint**.
Repeated rows from one study family are not counted as independent validation.
A method-model mismatch is a review flag rather than a fabricated conversion.

## Exclusions
No treatment efficacy recommendation, effect-size calculation, statistical
meta-analysis, study equivalence claim, patient genotype/phase inference,
per-individual prediction or model fitting. Quantitative modeling requires
actual two-reviewer source extraction, dedicated statistical analysis plans,
replication/validation cohorts, and clinical governance approval.

## Security and acceptance
- Migration: `docs/sql/14H169_approved_research_dataset.sql`
- Server RPC executable by `authenticated` only, with current-session and
  current-membership checks. Anonymous direct execution is revoked.
- Client verifies schema version, fingerprint shape, a complete bounded list,
  unique approved claim IDs, unique active series, source URL allowlist,
  exact scientific categories, genotype scope and endpoint unit constraints.
- Explicit expansion in **Evidence & provenance → Research dataset** initiates
  the protected read. Closing, sign-out or account switch invalidates
  in-memory records. No background download or persistent browser cache.
- Test coverage: empty dataset; duplicate studies and active series;
  negative numeric values; nonstandard contexts; invalid/unsafe source
  metadata; restricted accounts; desktop/phone browser flow.
- Verify all TypeScript, build, five-therapy and legacy integrity/parity CI
  before merge. Confirm Railway deployment matches exact merged SHA.

## Recommended next phase
Establish protocol-approved actual source extraction, reviewer allocations,
publication identity checks, and benchmark/data-readiness thresholds before
designing any hypothesis-testing statistical model. A tidy dataset format
alone is not evidence of biological response predictability.
