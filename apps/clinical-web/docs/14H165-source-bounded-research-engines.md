# Phase 14H165 — Source-bounded CFTR therapy and conflict research

## What is connected

The existing variant dossier retains the original five-regimen workspace. An
adjacent, collapsed **Response & evidence intelligence** disclosure now connects
two independent, executable TypeScript research methods:

1. `multiTherapyResearch.ts`: builds a five-regimen **research-only**
   assessment. It separates database response categories, historical
   `variant_evidence` flags, the bibliography and independently reviewed
   source observations. It never outputs a patient response, a percentage,
   drug indication or a recommendation.
2. `sourceConflictReconciliation.ts`: de-duplicates observations by
   independent study family, detects opposing same-method findings, identifies
   within-study inconsistencies and distinguishes clinical-vs-lab and
   different-scope differences from direct contradictions. Two independent
   reviewers and an exact linked reference are required before a claim may
   contribute to any direction of findings. Disagreements are never
   automatically adjudicated or averaged.

## Live data route

`researchSourceSnapshot.ts` calls the exact variant-scoped, member-gated,
read-only Supabase RPC in `docs/sql/14H165_verified_therapy_source_snapshot.sql`.
The RPC fetches historical response flags, conflict event metadata and
validation metadata; it intentionally excludes personal clinician/institutional
fields, free-text notes, raw evidence payloads and case data. The frontend
also reads the currently validated five-therapy profile and linked reference
register. All requests are made only on explicit disclosure, only by a
verified member; state clears immediately on account/role/variant switch.
The SQL independently checks active, unrevoked research membership.

Historical variants and all bibliography entries are **not** automatically
promoted into a reviewed pharmacological result. The current linked source
register does not populate ETI/Alyftrek claim fields, so today the real
workflow mainly exposes documented gaps and discrepancies. This is a
legitimate scientific research result, not a fixture or fabricated score.

## Evidence contract to complete later

The deterministic conflict engine accepts `DoubleReviewedSourceClaim` with:
exact source identity; variant + therapy + biological scope; distinct
reviewer IDs; source locator; independent study-family ID; method; finding;
and review timestamp. There is deliberately no importer from unreviewed
source labels. A future controlled, versioned double-review ingestion API
must be designed, approved and connected before nonzero claims can appear.

## Security and release

- `nfq_research_therapy_source_snapshot` has a fixed source schema,
  `SECURITY DEFINER` with empty `search_path`, inline membership gate and
  EXECUTE grants only to authenticated. It cannot update any record.
- RPC returns no direct institution/person/IP/session/clinical fields.
- Only 200 records per category may be returned; oversized inputs fail
  closed, rather than silently truncating evidence.
- No service-role credential is used by the browser.
- Public/guest/unassigned accounts never issue the RPC.
- No source or dossier results are cached persistently.
- The former classifications, rules, original uploaded HTML and the
  reviewed prior modules remain unchanged.
- Server-side and browser controls have different responsibilities. A
  frontend test cannot replace an authenticated production acceptance test.

## Validation

- Five regimens covered and original recorded classifications preserved.
- Repeat observations from one study family count once, never as independent
  validation.
- Different-scoped observations raise a review question, not a direct
  contradiction.
- Unreviewed/bibliography-only observations contribute no directional claim.
- Cross-variant, duplicated, incomplete and schema-invalid payloads fail.
- Existing clinical release, genotype and original-science regression CI must
  pass before merge and deployment.

**No clinical validation, predictive model performance or patentability is
claimed.** Institutional ownership and novelty require separate evaluation.
