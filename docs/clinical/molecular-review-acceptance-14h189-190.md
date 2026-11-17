# 14H189–190 · Molecular review and discovery acceptance

## Scope and evidence status

The Cystic Fibrosis Supabase project is `oxlkisjwfarseyqgeyuw`.
At the start of this phase (2026-11-17), the live research membership
register contained 1 active contributor, 1 reviewer and 1 administrator.
The approved source-claim register and the molecular-review register
contained **zero approved claims**. No records were added to manufacture
a positive discovery result.

Passing the application's CI validates code, parsing and browser
regressions. It does **not** prove that a real clinician has signed in,
submitted a paper, or completed two independent approvals.

## Production, non-mutating authorization acceptance

- All `nfq_evidence_review.mechanism_*` tables must have RLS enabled.
- `anon` and `authenticated` must have **no direct SELECT/INSERT**
  on any of the three private tables.
- The exposed `nfq_molecular_evidence_discovery` RPC must not be
  executable by `anon`; the only exposed use is `authenticated`.
- Unauthenticated calls and JWT claims without an actual, active row
  in `auth.sessions` must return SQLSTATE `42501`.
- A valid session without active membership, a revoked member,
  an anonymous session and guest access must be rejected.
- All responses must omit pending, rejected, withdrawn and superseded
  molecular proposals, even when their original publication is indexed.
- A molecular approval must have two unique reviewers, neither the
  submitter. The underlying source claim must itself be approved
  by two independent reviewers. No class, name similarity or
  bibliography-only match creates an approved mechanism.

## Real-account acceptance (not yet completed)

Use the organization's existing **real contributor**, **reviewer** and
**administrator** accounts and a genuinely relevant paper, without
creating placeholder scientific findings:

1. Contributor signs in and submits a genuine source-linked scientific
   observation for **independent source-claim review**, with exact
   variant identity and original publication locator.
2. Two independent eligible reviewers approve that source claim.
   The submitting account cannot approve its own claim.
3. Contributor proposes a molecular interpretation using that approved
   source; it initially remains `pending` and invisible in global discovery.
4. First independent scientific reviewer signs in and approves.
   The record remains `pending`; discovery still returns no new record.
5. Second, distinct scientific reviewer approves; the record becomes
   `approved` and enters source-verified global discovery.
6. A rejected interpretation remains absent from discovery.
7. Revised records preserve earlier audit; an older approval remains
   active until its new revision independently gains two approvals.
8. Confirm the source-original URL, variant identity, reviewed study
   family, mechanism category and limitations are consistent on
   both pages. Use mismatched notations such as `1716G/A` and
   `1716+1G>A` only to verify **non-equivalence**, never as linked variants.
9. Change a member's role/revoke membership and verify server denial
   even if a stale browser screen remains open.
10. Confirm no mutation of the five-therapy calculator or patient
    treatment eligibility occurs at any stage.

This last gate is intentionally outstanding until real source evidence
and independent reviewer actions exist.
