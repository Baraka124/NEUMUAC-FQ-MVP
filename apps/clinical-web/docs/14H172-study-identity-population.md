# Phase 14H172 · Underlying study identity and aggregate population provenance

## Scientific problem
A publication is not necessarily an independent experiment or clinical
cohort. A main clinical trial paper, an extension, a biomarker subanalysis and
a subgroup report may share participants or specimens. Counting these as
independent publications risks false replication and leakage between
development and holdout partitions.

This phase introduces **independently approved source-reported registration
and population metadata** without guessing whether an unregistered study is
independent.

## Reviewed, immutable `studyIdentity` fields

| Field | Source interpretation |
|---|---|
| `registryType` / `registryId` | Exact study registration: ClinicalTrials.gov NCT, ISRCTN, other source accession, or not reported |
| `publicationRole` | Primary report, follow-up/extension, secondary/subgroup analysis or unreported |
| `populationModel` | Clinical participants, patient-derived organoids, primary cells, cell lines, animal model or unreported |
| `diseaseGroup` | CF, non-CF control, heterologous expression, or unreported |
| `ageGroup` | Adult, pediatric, mixed or unreported |
| `cohortLabel` | Aggregate cohort/subgroup name from the source, or null |
| `populationDescription` | Optional, bounded aggregate description, not individual patient data |
| `sourceLocator` | Original table, Methods or supplement locator; required when anything is reported |

The UI tells users **not to enter individual patient details**. In a new
claim, every `studyIdentity` field is supplied as an explicit object,
including an all-unreported valid sentinel. Existing historical approved
claims retain `NULL`, rather than gaining fabricated registry accessions.

A new/updated claim cannot write these fields to the reviewed dataset without
the existing independent two-reviewer approval. The existing immutable
claim revisions, audit events, approved-source filters and source-linked
export fingerprint are preserved. Database/server and frontend each enforce
a strict 9-key object contract, source locator and registry format. The
new SQL validator and private column do **not** change any source therapy
classification.

## Conservative publication-to-study clustering
- On every approved-dataset snapshot, link all approved claims by identical
  normalized existing study-family label **or** identical reviewed
  registered-study key. The links are transitive across publication reports,
  variants and the five therapies.
- For each linked component, use one stable provisional study identity key.
  A registered key may connect publications that have different local
  study-family names. A claim with no registration retains its conservative
  existing family label.
- If two different registrations were assigned to one connected study-family,
  **do not split** those source records into separate validation partitions:
  report the registration conflict and disable the internal-holdout-planning
  flag for affected cohorts.
- Group records from the **entire** approved dataset before therapy or endpoint
  filters are applied, so filtering cannot inadvertently shift related
  publications into opposite holdout/development partitions.
- Count linked identity groups, not duplicate bibliography entries, in
  descriptive study-family coverage. Export the canonical group identifier and
  per-record registration and aggregate population fields.
- Labels and registry IDs do **not** themselves prove identical samples,
  independent trials, statistical power, or external validation. Linking is
  intentionally conservative and source-traceable; disputed identities need
  curator reconciliation.

## User workflow
**Variant dossier → Response & evidence intelligence → Propose source claim →
Study identity & population.** The user chooses an actual linked reference,
enters source-reported study identity, and submits the immutable claim for
two independent reviews.

**Evidence & provenance → Research dataset → Inspect approved dataset** shows
the reviewed registration, population, source locator, study grouping,
data-quality warnings, and JSON/CSV exports. The quantitative analysis
protocol uses the same linked groups when planning source-level partitions.

## Safety and release validation
Migration: `docs/sql/14H172_reviewed_study_identity.sql`, **CFTR
Supabase project `oxlkisjwfarseyqgeyuw` only**. No new public tables,
patient data, automatic publication-derived statistics, statistical pooling,
response probabilities, or role grants.

CI checks must cover complete legacy source-claim/browser contracts, two-review
integrity, source-access control, therapy parity and the new registration
linking cases. The SQL validator must pass valid/invalid test vectors on the
actual project after migration. Validate that authenticated research RPCs
remain unavailable to anonymous users.

**Important limitation:** Real linked source records are not automatically
retrofitted with a guessed study identity, and the production database can
still contain zero independently approved source claims. This phase builds the
infrastructure that makes expert review of overlaps possible; it does not
supply confirmed new biological response data.

## Next scientific milestones
A research-approved study-link adjudication protocol; case-based metadata
verification of trial registrations, reports and subgroup/arm identifiers;
controlled labels for study inclusion/exclusion; only then prespecified
sample-size and effect-estimand extraction for any future quantitative
analysis, with external clinical validation.
