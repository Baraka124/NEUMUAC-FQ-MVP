# neumuacFQ · 14H206–207 — Independent scientific reference validation

## 14H206 — Authenticated workflow verification

The new expertRegistryWorkflowE2E.test.ts uses an **in-memory authenticated-RPC simulator**. It exercises two distinct reviewer identities, conflicting source interpretations, independent adjudication, attempted self-review and replay, attempted third submission, and refused unsupported source mapping.

Scientific-integrity fixes:
- Accept explicit timezone offsets returned by PostgreSQL timestamptz serialization, rather than requiring a literal Z suffix.
- Treat differing source locators as adjudication-requiring conflicts in the proposed database function.
- Correct the authenticated response parser's control-character validation to avoid rejecting ordinary text while still preventing control characters.

**This simulator is not a test of actual Supabase authentication or RLS.** No production database schema or records were modified.

## 14H207 — Blinded primary-publication protocol

The new blindedReferenceProtocol.ts prepares deterministic, publication-anchored review packets for the three genuine literature challenges established in 14H194–195:

| Challenge | PMID | Scientific question |
| --- | --- | --- |
| G551D / ivacaftor | 22047557 | Preserve genotype-cohort scope, comparator, endpoint and timepoint |
| Phe508del / minimal function / ETI | 31697873 | Avoid attribution of trial-level benefit to the minimal-function allele alone |
| c.1584G>A / 1716G/A complex-allele splicing | 33375403 | Preserve complex allele and splicing context, with no ETI or Alyftrek-response inference |

Each challenge requires an **existing manually verified internal variant ID**. Packets include original publication URLs and independent extraction questions, but **no claimed expert gold standard**, other reviewer answers, platform verdict or clinical treatment decision. Results explicitly withhold independent-review completion and clinical actionability.

## Remaining validation gates

1. Establish isolated CFTR staging infrastructure. The connected Supabase project named Cystic Fibrosis is active and must not be used for experimental writes.
2. Review and apply the proposed expert registry migration only in staging.
3. Execute real Postgres role, RLS, session, concurrency, adversarial-input and replay tests.
4. Have qualified independent experts extract actual primary publication evidence and record discrepancies with source locators.
5. Use a separate adjudicator and independent source-claim mapping. Report all missing or incompatible cases, without invented agreement or scientific-accuracy measures.
6. Require CI success and independent scientific/security sign-off before any production merge or migration.

No UI, therapy logic, clinical records, or live database changes were made in 14H206–207.
