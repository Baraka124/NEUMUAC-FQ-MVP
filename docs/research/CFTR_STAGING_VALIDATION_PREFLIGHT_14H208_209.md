# neumuacFQ · 14H208–209 · Staging security and independent reference-readiness gate

## 14H208 — Role/permission denial tests

Added `supabase/tests/14h208_expert_registry_negative_auth.sql`, an isolated-staging-only negative authorization test. It asserts:

- The versioned expert RPC exists with pinned empty search path, security-definer status, and no anonymous EXECUTE permission.
- Four internal evidence tables have RLS enabled and no direct authenticated table grants.
- An anonymous SQL role cannot invoke the expert RPC.
- Merely holding the SQL `authenticated` role with an empty JWT claims object does not authorize the RPC.
- All setup is enclosed by a transaction and rolled back; this is not intended to populate patients or reviewers.

**Not executed:** The linked CFTR Supabase project is a live `Cystic Fibrosis` database, not an isolated staging copy. Read-only inspection on November 18, 2026 verified that the proposed expert RPC and tables do **not** exist there. Running a proposed DDL migration against the live database is deliberately out of scope.

The SQL test is a **negative security gate**, not a comprehensive verification of Postgres concurrent writes, session invalidation, user-role assignment, audit immutability, or independent reviewers. Those require separate staging transaction and human-in-the-loop tests.

## 14H209 — Publication-level reference-readiness gate

Added `referenceReadinessPreflight.ts`, a deterministic read-only decision boundary combining:

- Authenticated expert-registry record (as returned by the transport decoder);
- Independent review chronology and audit continuity;
- An exact case/variant scientific evidence payload, including approved source claims and exact original references;
- Comparison status from the previously implemented science engine.

The preflight rejects cross-publication records, different or forged external extractions, duplicate case/variant pairs, and invalid workflow histories. It differentiates missing first/second reviews, pending third-party adjudication, un-attested mappings, incompatible evidence, and completed *software-level* review chains that still lack external scientific verification.

Even a complete software-level review chain **cannot certify scientific accuracy** or grant a clinical treatment decision. The outputs retain `canCertifyScientificAccuracy:false` and `readyForClinicalDeployment:false` unconditionally.

## Next release criteria

1. Provision a separate CFTR staging project, copy only schema and authorized nonclinical test fixtures, and verify RLS with real test accounts.
2. Apply the reviewed proposed SQL in staging, then run 14H202 and 14H208 SQL negative tests and true multi-session review/adjudication transactions.
3. Validate the newly deployed RPC output against the TypeScript decoder and independent audit engine, including millisecond/timestamptz formats, ordering, nulls, and foreign keys.
4. Have two independent qualified CFTR experts review the actual primary publications through the blinded packet protocol, with a separate adjudicator for disagreements.
5. Require independent scientific review of source claims, genotype context, endpoint, comparator, and timepoint, before treating comparisons as meaningful.
6. Preserve every missing, incompatible, and disputed case in reproducibility denominators. No empirical scientific accuracy rate is justified by the present software-only fixtures.

No application UI, legacy index, medication eligibility, clinical variants, or production tables were modified.
