# 14H136b — Recorded classification snapshot comparison, without independent validator inference

## Historical source

The project owner supplied `index (85)(1).html`, preserved separately. Its validation modal and submission logic (roughly lines **19527–19702**) recorded a `snapshot_cftr_class` value for each submitted validation and attempted checks for independent clinicians and field-level disagreement.

**Important historical limitation:** the original client-side name/PIN checks and status count cannot establish independent peer review or provide transactionally enforceable research permissions. We do not reproduce that weak authorization model.

## Current modular boundary

The existing `liveResearchHistory.ts` intentionally fetches only `id,variant_id,action,created_at,confidence_level,snapshot_cftr_class` from validation records (and redacted conflicts). It does not expose reviewer names, roles, notes, institutions or session metadata. It cannot determine whether two recorded validation events represent two independent, qualified people.

## Additive implementation

`src/domain/recordedClassSnapshotComparison.ts` performs an immutable, read-only textual comparison of `snapshot_cftr_class` values on `VALIDATED` events:
- **No events**, **insufficient recorded class snapshots**, **the same recorded class text**, or **different recorded class texts**.
- Treat blank snapshots as missing data, not as an inferred functional class.
- Normalize case/spacing only for equality; preserve recorded display values.
- Always report `independentValidatorsEstablished:false`. Never infer clinician independence, scientific disagreement, reclassification, or present-day genotype from these historical snapshots.

Only when class snapshot strings vary, the existing optional **Review history → Recorded chronology** reveals a small expandable comparison note. This does **not** replace the full history, existing unresolved conflict records, permission-controlled research contributions, or evidence register.

## Test and safety gates

Domain tests: mixed snapshot classes, same class with case/spacing differences, missing snapshots, actions other than VALIDATED, and duplicate events that are *not* evidence of independent clinicians. Connected browser: mobile, variant 35 with differing class texts, record navigation to variant 19 with no difference, and no identity fields requested.

No DB changes; no clinical record writes, no original HTML overwrite, no FQ auth/role changes, no neumDESK changes. All application CI must pass before merging.

## Remaining original parity

To implement original two-clinician validation safely, a **separately approved** server-side transactional workflow must verify actual user identity, professional authorization, object-level access, independent reviewers, and review-decision provenance. That is **not** part of this read-only release.
