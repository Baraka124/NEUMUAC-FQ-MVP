# Phase 14H115 — Unified account lifecycle and credential operations

## Ownership and source-of-truth boundaries
- **neumDESK**: `medical_staff` is the professional record; `app_users.medical_staff_id` associates a neumDESK login with a professional. `research_lines.coordinator_id` refers to `medical_staff.id`. The verified research-line designation is professional metadata, **never** a grant of FQ administrator or reviewer privileges.
- **neumuacFQ**: Supabase `auth.users.id` is the login identity, and `nfq_research_memberships` with `nfq_membership_audit` is the authority for the three research roles. An authenticated account without an FQ role is still a valid signed-in account.
- **Professional link**: create an explicit, verified mapping of the neumDESK professional ID to the neumuacFQ auth UUID through a privileged integration. Distinct auth systems **cannot be joined securely by email matching alone**. User-editable profile metadata is not suitable for authorization.
- **Guest**: FQ account with no verified, active professional link to neumDESK. Guests can still be assigned contributor/reviewer privileges through the existing audited role management, but never inherit neumACt affiliation by email or display-name claim.

## Acceptance identities
- `devops.neumologia@gmail.com`: intended shared **institutional administrator** account (active bootstrap granted separately). The mailbox itself is not a clinician; administrator actions must still retain account-level audit and where practical attributable operator identity.
- `barakaaloyce750@gmail.com`: user's personal research account associated with a neumDESK profile (association to a **specific FQ Auth UUID is not yet verified**). Grant contributor rights only after creating/verifying an individual FQ account.
- `techmedixlink@gmail.com`: controlled guest testing identity. Do not pre-assign professional affiliation, assume existence in Supabase Auth, or grant scientific privileges without explicit administrator action.
- These three accounts are controlled by one person for testing. Therefore they **cannot count as independent scientific reviewers of one another**.

## Credential and session lifecycle
| Action | Who performs it | Required behavior |
|---|---|---|
| Invite internal clinician | FQ admin | Select verified neumDESK profile; generate FQ invite to its confirmed account address; track pending/accepted/expired; avoid printing temporary passwords |
| Invite guest | FQ admin | Invite an external address with guest designation and explicit narrow access request; no neumDESK link inferred |
| Activate | Invited individual | Recipient completes email verification and chooses their own password, or uses approved passwordless/SSO authentication; no passwords circulated by admin |
| Assign role | FQ admin | After identity verification, call existing `nfq_admin_set_member_role` as that administrator using their JWT; record author and before/after state |
| Change or revoke role | FQ admin | Apply role changes server-side; use RLS to enforce immediately for future operations; invalidate/close ongoing privileged sessions when necessary |
| Password reset | Individual or authorised admin-initiated reset | Use identity-provider recovery email with short-lived one-use links; never let admin read another user's current or new password |
| Credential rotation | Account owner / approved security admin | Rotate compromised passwords immediately, revoke existing sessions and inspect access audit; service keys separately via protected backend/secret manager |
| Suspend | FQ admin | Deny new privileged actions, invalidate sessions as available, revoke application membership without deleting scientific audit history |
| Re-activate | FQ admin and account owner | Re-verify identity, require fresh login, explicitly reinstate permissions with a new audit event |
| Offboard | FQ admin | Revoke FQ role and sessions, remove professional link when appropriate, preserve scientific attribution/audit events |
| Recover an admin | Second independently verified admin or privileged, recorded break-glass | Avoid irreversible single-admin lockout; do not expose service-role or project credentials in the browser |

The **institutional group admin account** should use a strong unique password, MFA and a restricted operator list. Rotating its credentials is a security action, not routine redistribution of the same password to clinicians.

## Existing neumDESK capability
The back end already has `GET /api/identity/staff` protected by `identity.users.view`, `POST /api/identity/development-accounts` guarded for development only, and `POST /api/identity/users/:id/security` with `revoke_sessions` and `require_password_reset`. It also has staff-type permission overrides. These are **not** a public cross-app identity API, and development password creation must not be reused in production. The production FQ credential flow must use Supabase Auth's secured invitation/recovery administration from a **backend** whose operator is authenticated and authorised.

## Server integration contract — NOT deployed yet
1. Define a read-only professional profile projection with minimal fields: `desk_staff_id`, `full_name`, `staff_type`, `department`, `research_group`, `research_line`, `coordinator_of` and verification timestamp. Never include phone, attendance, leave or clinical-patient records.
2. Create a private account linkage registry with unique constraints on both FQ Auth UUID and neumDESK professional ID, verified-by, verified-at, lifecycle status and immutable audit. An institutional administrator account need not falsely impersonate a named clinician.
3. Expose a server-side `GET /me/professional-profile` requiring current FQ session and reading only the mapped identity. No direct neumDESK personnel-table reads from the FQ browser.
4. Expose administrator-only roster/invitation/status operations with server-authorized role checks, invitation state and rate limiting; never return password hashes, reset tokens or secret keys.
5. Implement **person-level scientific authorship**: trusted reviewer-person ID must differ from proposer-person ID; unresolved identity links must not be used to claim independent review. Keep the existing different-auth-UUID check as an additional control.
6. Exercise separate real accounts and test no-link, revoked-link, ambiguous-match, cross-account impersonation, invitation replay, expired reset, revoked membership and lost-session cases before enabling access by default.

## UI design
The signed-in header should show the verified person's name and professional designation when the link exists, otherwise neutral account identity and **Guest / unlinked account**. Keep permission as a *separate line*: e.g. 'Research access: Contributor', 'Not assigned' or 'Administrator'. Research Line 2 coordinator is a professional title, not FQ privilege. Provide an administrator roster with filters **Members / Guests / Pending invitations / Suspended**, role controls, invite/resend, revoke, and scoped audit. Never suggest an email address or non-existent account UUID has already been provisioned.

## Release constraints
No auth users, passwords, invitations or role grants are created from this document. Clinical source evidence, therapy classifications, legacy responder/non-responder logic, variants and Helios remain unchanged. Existing FQ feature flags continue to gate scientific operations.
