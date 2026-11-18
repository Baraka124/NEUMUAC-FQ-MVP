# neumuacFQ · 14H212–213 — Reviewer blinding and executable staging gate

## 14H212 · Stop premature peer-result disclosure

The proposed private registry RPC previously returned every submitted expert extraction to any signed-in research member, even when only reviewer 1 had submitted. This compromised the **independence of reviewer 2's blinded extraction**.

The proposed SQL now filters both the returned expert rows and returned audit events:
- Until the second extraction is committed, only the caller's own extraction/audit event is visible.
- An unsubmitted reviewer receives no peer extraction or peer event.
- After both independent submissions exist, the records become visible to the authorized workflow for review/adjudication; the original findings are not changed.
- Both normal `list` and `submit-extraction` responses use the same row-level visibility logic.

This is a **proposed source change**, not an active production permission. `expertRegistryBlindingContract.test.ts` adds a static SQL regression guard. Real SQL account/isolation tests in staging remain mandatory.

## 14H213 · Executable staging security gate

The repository now contains `scripts/verify-expert-registry-staging.mjs`. It invokes the existing rollback-only SQL security checks with `psql` against a separately reviewed staging database.

Requirements:
1. The reviewed proposed migration must already have been applied to a designated isolated CFTR staging project; the runner **never deploys DDL**.
2. `psql` must be installed and available in PATH.
3. The staging database connection URI must be provided only through an environment variable; no connection string or credentials are committed.
4. The staging project reference must be distinct from the known active CFTR production reference. The runner requires that the DB hostname or pooler username identify the supplied staging reference.
5. Run only after verifying no clinical data or production access is involved.

Example (shell placeholders, no working credentials supplied):

```bash
export NFQ_STAGING_PROJECT_REF="<isolated-staging-reference>"
export NFQ_PRODUCTION_PROJECT_REF="<active-CFTR-reference>"
export NFQ_STAGING_DB_URL="<postgresql-connection-URI>"
node scripts/verify-expert-registry-staging.mjs
```

The runner calls:
- `supabase/tests/14h202_expert_registry_security.sql`
- `supabase/tests/14h208_expert_registry_negative_auth.sql`

Both scripts roll back their own transactions. A failed SQL assertion exits nonzero. The runner refuses the existing active Cystic Fibrosis reference even if an operator mislabels it as staging.

**Current validation boundary:** no separate CFTR staging branch was available in the connected Supabase account; no paid branch/project was provisioned; this runner has **not** been executed against a database. CI static contract tests cannot certify production access control.

## Real staging acceptance criteria

- Unsubmitted reviewer 2 cannot see reviewer 1's finding, locator, source-claim ID or audit identity.
- Reviewer 1 cannot edit or replay an already committed review.
- The second independent submission releases the workflow to a distinct authorized adjudicator if source interpretations differ.
- No reviewer or adjudicator can attest their own source mapping.
- Missing JWT, inactive user session, revoked membership, anonymous role and direct table writes are denied.
- Concurrent third-reviewer submissions and duplicate mapping attempts fail transactionally.
- Evidence mapping checks the real PMID, exact approved primary claim, genotype and experimental endpoint.
- Clinical accuracy and patient-level treatment decisions remain outside the expert registry's authority.

No application UI, existing therapeutic logic, patients or live CFTR data were altered. The proposal must remain a draft until a real isolated staging database and independent CFTR scientific reviewers are available.
