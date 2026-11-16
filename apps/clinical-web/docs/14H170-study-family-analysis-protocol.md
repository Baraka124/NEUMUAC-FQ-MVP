# Phase 14H170 · Study-family-safe quantitative analysis protocol

This phase adds **pre-analysis cohort eligibility and leakage controls** to the
approved-source research dataset. It is a research-planning artifact, not a
trained model, statistical meta-analysis, externally validated predictor or
clinical decision-support recommendation.

## Input and authorization
- Input is the existing, real, independently twice-reviewed source snapshot
  from `nfq_approved_research_dataset()`; there is **no new writable database**.
- The source endpoint is already schema-checked and variant-linked. The analysis
  protocol is built locally from that snapshot and can be exported as JSON.
- Anonymous accounts and unassigned users cannot load the underlying dataset;
  the protocol panel is not mounted without a verified dataset.
- Parent sign-out, account switching and closure clear the in-memory snapshot.
  No query, model output, or statistical result is saved to browser storage.

## Reproducible cohort definitions
A row can be eligible for *descriptive, source-level context comparison* only
when it has a two-reviewer approved, nonmissing numerical outcome and a
complete exact comparison key. The key includes variant, modulator, biological
scope, genotype pair, study method, experimental endpoint, reporting statistic,
unit, biological model, comparator, and source timepoint.

Missing/nonnumeric observations, laboratory-vs-clinical method contradictions,
and nonstandard or insufficiently specified numeric outcomes are retained in
the exclusions manifest with exact claim IDs and reasons. Their source records
are **not deleted or rewritten**.

Each exact-context cohort reports source observation counts, distinct
*labelled study families*, and a provisional per-family assignment. The
study-family string is normalized for case and spacing when allocating all
records, so the same labelled family cannot enter both development and
internal holdout across variants, endpoints or therapies.

For exploratory planning only, a deterministic stable FNV-1a label hash assigns
approximately one fifth of families to `internal-holdout` and the rest to
`development`. A cohort is flagged as *internally split-plannable* only when
it has at least eight labelled families, at least five on development, and at
least two on internal holdout. **These are operational UI guardrails, not
statistically determined training sizes, valid power thresholds or guarantees
of unbiased validation.** If a split has insufficient families on either side,
it is marked descriptive-only. No partition fabricates additional sources.

**Important limitations:**
- A separate PubMed article or a differently labelled study may describe the
  same trial, so label-based separation does not establish true source
  independence without bibliographic cross-reference and curator review.
- No per-arm sample sizes, variance/standard-error, effect estimates,
  treatment confounders, cohort provenance or demographic distributions have
  been established here.
- An internal source-family holdout is **not** an independent external
  patient/site validation cohort.
- No statistical model is fitted, no cross-study effect is pooled, no
  classification accuracy, response probability, confidence interval or
  treatment recommendation is generated.
- Selection filters only change the local audit; they do not mutate scientific
  classifications or require further network requests.

## User interface
Go to **Evidence & provenance → Research dataset → Inspect approved dataset →
Quantitative analysis protocol → Inspect protocol**.

Two compact selectors filter therapy and source endpoint, while preserving
separate cohorts for differing experimental contexts. The panel reports
reviewed, eligible, excluded, exact-context cohorts, and provisional internal
split candidates. The export is versioned
`nfq-study-family-analysis-protocol-v1` JSON linked to the same approved source
snapshot SHA-256. It contains the exact included claim IDs, reported numbers
and provisional allocation, as well as excluded claim IDs and explicit
scientific limitations.

At the time of implementation, the production project still contained
**zero independently approved source claims**. The correct state is zero
numeric observations, zero cohorts, and no possible internal holdout.

## Validation and next steps
Unit tests cover empty datasets, missing source outcomes, incompatible methods
and models, exact-context separation, duplicate within-study observations,
reproducible family assignments across variants/therapies, filters, operational
split thresholds and no-prediction boundaries. Browser tests verify researcher
access and the empty-state protocol; existing integrated browser shards,
clinical build, therapy parity and legacy guards must pass before merge.

The next scientific step is source-linked **sampling and uncertainty
metadata** (n, dispersion, arm/measurement definition, repeated measures,
phenotype and population eligibility), independently reviewed alongside
endpoints, followed by a formally approved statistical analysis plan and
external validation design. A computable study-family split alone is not
authorization to train or deploy a clinical model.
