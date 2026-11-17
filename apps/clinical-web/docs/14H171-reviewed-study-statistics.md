# 14H171 — Source-reported sampling, study design and uncertainty

**Scientific scope.** Extend an independently reviewed neumuacFQ source
observation with study sampling and uncertainty fields recorded **in the
original publication**. This is still an evidence system, **not** a
meta-analysis, a treatment recommendation, or a prediction model.

## Fields owned by the source claim revision

The new `studyStats` record is reviewed together with the therapy, variant,
exact endpoint and original source citation:

| Source field | Representation |
|---|---|
| Unit actually counted | participants; donors; biological replicates; technical replicates; not reported |
| Design | parallel arms; paired/repeated measures; single arm; not reported |
| Intervention n | exact integer 1–1,000,000, or null |
| Comparator n | exact integer 1–1,000,000, or null |
| Uncertainty type | source-reported standard deviation; standard error of mean; reported 95% CI; not reported |
| Uncertainty value | exact SD or SEM (positive finite source number) |
| 95% CI limits | separately reported lower and upper bounds, no conversion |
| Estimate to which uncertainty applies | reported endpoint; intervention arm; between-group contrast; not reported |
| Precise source locator | original table, figure, paragraph or supplement; mandatory when statistics are reported |

**Counts are not interchangeable.** An organoid replicate, experimental
culture, biological donor and clinical participant are not treated as one
unit. Source-reported `n` is not inferred to be a clinical cohort size.
Technical replicates are explicitly flagged as not independent biological
samples. Unknown values remain null. A quoted SD/SEM or confidence
interval must be tied to a source-reported numerical endpoint; the
platform never estimates one from another or extrapolates an effect.

## Strict source-to-analysis controls

- Validations exist on **both the browser and PostgreSQL**.
- The existing immutable claim/revision, session authentication, role
  authorization, audit history and two independent scientific reviewer
  approvals remain in force. New statistics cannot appear as approved
  without both attestations; corrections create new claim revisions.
- Private database column: `nfq_evidence_review.claims.study_stats`,
  restricted by `nfq_evidence_review.study_stats_valid(study_stats, endpoint)`.
  Legacy claims retain null rather than being rewritten or backfilled.
- `public.nfq_reviewed_source_claims` requires the added
  `studyStats` key on submitted/revised claim data, while list, review
  and withdrawal retain their existing authorization.
- `public.nfq_approved_research_dataset()` includes `studyStats`
  in the ordered, SHA-256-addressed source snapshot. The v1 document
  is *additively extended*: old approved rows are returned with null
  study-statistics data; no prior study numbers are fabricated.
- The approved dataset and analysis-protocol JSON/CSV include reported
  counts and uncertainty fields without using them as statistical
  weights or computing pooled effect sizes. A reported CI is not
  converted into SD or SEM. Protocol holdout assignments still separate
  labelled study families but are not external validation.

## Uncertainty and source quality flags

Missing counts, unknown arm structure, missing dispersion, technical
replication, a reported CI inconsistent with its linked source result,
and mismatched contrast/endpoint definitions are disclosed as review
flags, **not** silently amended. These flags are not a claim that the
source paper was disproven.

## Verification

Migration `docs/sql/14H171_reviewed_sampling_uncertainty.sql` is applied
to **CFTR Supabase project `oxlkisjwfarseyqgeyuw`** only, after the
clinical/browser regression gate. Check that it preserves the original
grant boundary and private-table RLS. TypeScript/Vitest tests cover
positive and invalid sample sizes, paired-versus-parallel structure,
SEM/SD/CI, missing endpoints, source locator and technical replication.
Connected browser tests exercise the actual variant form and its
disabled-state behavior for invalid source data.

No real experimental measurements were introduced during migration.
Actual population/sample metadata require original source inspection and
two independent approvals. Individual patient data are not collected.

## Necessary research work beyond 14H171

A publishable quantitative study requires explicit study-arm estimands,
independent experiment definitions, variance/CI provenance, reproducible
cohort eligibility, publication-study deduplication, a prespecified
statistical analysis plan and external validation. **This phase does not
train, fit, benchmark or authorize a response-prediction model.**
