# Phase 14H104 — research membership foundation: deployment record

Deployment verified on 2026-11-04 in the existing Cystic Fibrosis Supabase project.

## Applied
Supabase migration: `20261104090559_neumuacfq_phase_14h104_research_membership_foundation`.

This was the additive research-role portion of `supabase/migrations/20261015190000_nfq_research_role_foundation.sql`:
- `public.nfq_research_memberships` with one account-scoped, active-role record and self-read RLS;
- `public.nfq_membership_audit`, RLS enabled with no public policies or API grants;
- `public.nfq_admin_set_member_role(uuid,text,boolean)`, an authenticated RPC with a database-side active-administrator check and audit insertion.

**Important:** The historical 20261015190000 file also revokes legacy shared-PIN endpoints. Those revocations were **not** applied in 14H104. Do not equate the historic file with the deployed subset or rerun that full file blindly.

## Verification recorded
- Migration entry confirmed through Supabase migration history.
- Membership row count: 0; audit row count: 0.
- Self-read policy `nfq_membership_read_self` confirmed.
- The existing variant/evidence/Helios tables and their RLS policies were not modified in this phase.
- No account was automatically promoted to administrator. Initial bootstrap remains pending verified account ownership and a privileged audited maintenance action.
- No new scientific write capability was enabled.

## Next checks before editing or review
1. Confirm the authenticated account UUID with the account owner through a secure administrative procedure; do not infer identity from the single account in Auth or email matching alone.
2. Explicitly bootstrap one administrator with an attributable maintenance record, then verify the signed-in UI reports the assigned role.
3. Test RPC denial for unassigned, revoked and non-admin accounts; verify the audit event for authorized role changes.
4. Implement draft evidence proposals and independent scientific approval with server-side authorization and immutable audit records. Do not enable direct public/standard authenticated updates to scientific source rows.
5. Before broader RLS changes, reconcile the current production policies with the older `20261015191000_nfq_reviewed_write_lockdown.sql`; do not execute that migration on assumption.

## v4 regression baseline
Maintain legacy response/non-response categories and nuanced class/ETI therapy handling; public evidence provenance, ClinVar/PubMed read paths, Helios and contradiction read flows, research-context return navigation, accessible contextual information controls, compact clinical UI, and geographic hit/miss recording disabled.

Supabase security advisor observations at deployment: membership audit intentionally has no SELECT policy; the new administrator RPC is flagged as exposed SECURITY DEFINER (intentional RPC surface, but requires active-admin and RLS/privilege denial tests before first use). Other pre-existing security advisor warnings are outside this phase.
