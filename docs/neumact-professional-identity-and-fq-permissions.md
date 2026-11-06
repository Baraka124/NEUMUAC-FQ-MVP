# neumACt professional identity and neumuacFQ authorization

## Purpose
A professional can belong to the neumACt research group, have a recognizable profile, and use general research-group resources without being assigned a role in the specialized neumuacFQ scientific workflow. The group directory is authoritative for **professional affiliation**; neumuacFQ is authoritative for **CFTR authorization**.

## Two separate records, linked by verified identity

**neumACt profile** (source: existing neumDESK/group staff directory, to be integrated after inspecting the live schema): stable staff identifier, display name, professional title, clinical/research affiliation, relevant unit, group membership status and a minimal member-facing profile. The first name/role shown to a clinician should come from this verified directory, not from a public web search, claimed email display name, or editable Supabase `user_metadata`.

**Research authorization** (already live in the neumuacFQ Supabase project): `nfq_research_memberships` keyed to the authenticated `auth.users.id`, with role (`contributor`, `reviewer`, `administrator`), grantor, grant timestamp and revocation status; all changes in `nfq_membership_audit`. No source of truth for permissions may be inferred from a clinic's name, a staff directory entry, or successful login.

**Account-to-profile link**: the neumACt staff identifier must be explicitly associated with a verified authentication UUID. Back-office invitation/matching is required; email equality alone cannot confer rights. The link must be removable, audit logged, and fail closed if stale or ambiguous.

## Practical experiences

- **Verified neumACt professional, no neumuacFQ assignment**: after sign-in, see personal display name, unit/affiliation and group-oriented available resources; see public CFTR variant data and a clear, non-alarming message that scientific contribution is not assigned. The private proposal and administrative interfaces are inaccessible.
- **Research contributor**: profile plus source-correction submissions; no direct modification of published evidence.
- **Scientific reviewer**: profile plus independent review queue and recorded decisions; cannot review their own submitted proposal; acceptance does not automatically publish.
- **Administrator**: profile plus account authorization (assign/change/revoke), audited governance and eventually controlled catalog editing, provenance and publication management. Administrator status does not exempt scientific corrections from independent validation or allow unlogged direct changes to therapy-response classifications.
- **Unverified/external user**: cannot obtain neumACt member benefits or private research privileges from a claimed display name or login alone.

## Phase 14H113 delivered
An administrator-only management form calls `nfq_admin_set_member_role`, a pre-existing, server-side role-checked and audited RPC. The UI requires confirmed account UUID and explicit action; status is not an authority claim. No staff are invited or auto-enrolled by this change. No source/variant/therapy mutations. Do not mistake the form for a complete membership directory.

## Next implementation gates
1. Inspect the *actual* neumDESK personnel/auth data model and confirm authoritative professional identifiers, consent and visibility expectations.
2. Build a **read-only signed-in profile** using that directory, with a one-to-one validated account association and minimal information. Do not put clinician personal contact details in a public catalogue by default.
3. Add a **scoped administrator roster** that enumerates verified research accounts and their current assignments, using a server-authorized RPC (not a broad SELECT policy on `auth.users`).
4. Add an invite-and-identity-verification workflow to link a clinician's neumACt profile to an FQ Auth account. When a member signs in, membership is shown automatically, but specialized CFTR research permissions remain explicitly granted.
5. Test real authenticated sessions (administrator, contributor, reviewer, member-only, unassigned, revoked), session switch and request replay behavior before expanding write tools.
6. Release controlled evidence editing, validation and publication modules separately, with provenance, dual-control where required, and regression protection for ETI, legacy responder/non-responder, exceptional variants and Helios.

The intended scientific collaboration identity is *human-first*, but permissions are always enforced by verified database authorization.
