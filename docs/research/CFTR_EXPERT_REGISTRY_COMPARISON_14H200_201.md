# neumuacFQ 14H200–201 · Authenticated expert registry and scientific comparison

## Scope

This extends 14H198–199. No clinical UI, therapy-eligibility rule, variant classification or response prediction is changed. The work is not evidence that real human double extraction has occurred.

### 14H200 — Authenticated research review registry

- Proposed, **not deployed** Supabase migration: `supabase/proposed/20261118124500_nfq_expert_reference_registry_v1.sql`.
- Stores at most two independent human extractions per exact research challenge and variant, plus a third-party adjudication when they disagree.
- Server derives author identity and UTC submission time from verified Supabase session/JWT, **not client-supplied user IDs or timestamps**.
- Private tables have RLS enabled, explicit grants revoked and access routed through restricted RPC.
- Requires active, non-anonymous research membership; reviewer/administrator role for independent adjudication and claim mapping.
- Append-only audit events and unique per-case reviewer constraints.
- The HTTP client rejects missing sessions, unauthorized responses and malformed response envelopes.

### 14H201 — Comparability and agreement

- A scientific comparison needs an **explicit independent mapping** between a selected published challenge and an approved source claim.
- Preserve PMID, internal catalogue variant, genotype scope, endpoint, timepoint, study context, source locator and separate observer identities.
- Never derive a drug-response label from `supports` or `does-not-support`: the expert must separately attest the comparable **reported source finding**.
- Report `agreement`, `disagreement`, `missing-expert-reviews`, `missing-source-claim`, `unresolved-disagreement`, `incompatible-evidence` or `indeterminate`.
- No statistical meta-analysis, treatment recommendation, new clinical classification, or implication of efficacy.
- No claim of external validation is made; `scientificAccuracyValidated` and `usableForClinicalDecision` remain false.

## Staging blockers / required gate

The proposed SQL is **not** yet production ready. Before execution:
1. Independently review exact database schema, permission grants, RPC and RLS (including whether the source reference belongs to the anchored PMID and internal variant).
2. Validate RPC payload cardinality, race conditions, replay behavior, immutable audit, type safety and row-level access on an isolated staging project.
3. Confirm that an attested mapping references a publication-linked, approved and correctly scoped source claim. No cross-publication mapping may be accepted.
4. Execute the complete TypeScript build, unit tests, Postgres test transactions and negative security tests.
5. Add a verified read integration to research views only after end-to-end checks and reviewer governance approval.

The client is an interface contract; its presence does not prove the database RPC has been deployed.

## Added tests
- `expertRegistryService.test.ts`: access-token requirement, denial behavior, exact RPC request shape, response-envelope fail-closed checks.
- `scientificBenchmarkComparison.test.ts`: missing experts, unresolved disagreement, missing source claims, malformed mappings, and independent attestation constraints.

**No real expert submissions, source adjudications, efficacy results, or patient data have been created.**
