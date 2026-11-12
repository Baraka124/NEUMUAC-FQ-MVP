# 14H137C5 — Authenticated research access and invitation workspace

## Authority and scope

The owner's untouched original `index (85)(1).html` remains the historical capability and design reference. The modular CFTR platform must **retain and extend the original depth**, never substitute decorative UI for evidence, capabilities or operational correctness.

C5 continues the audited original-to-modular UI program with the operationally sensitive parts of the research workspace: invitations, verified institutional identity, restricted account directory, roles, separate guest designation and contextual help.

## Source-grounded findings and implementations

| Component | Existing behavior / issue | C5 correction |
|---|---|---|
| `AdminInvitationPanel.vue` | Form opened without keyboard focus on recipient email. Escape was not a composer-level cancellation path; buttons were visually inconsistent with the original quiet controls. | Focus the email field after opening; Escape/Cancel closes and returns focus to the launch action; preserve typed-email validation, one-time acknowledgement, known-account duplication blocking, uncertain request blocking, read-only history and server-confirmed dispatch. Compact intrinsic 40px outline buttons and bounded composer. |
| `AdminGuestAccessPanel.vue` | After a successful designation write, calling `check()` cleared the confirmation notice. An asynchronous server readback was performed but the operator had no lasting outcome text. | Preserve notice through readback, show **verified** success only if the re-read current state matches the requested operation; otherwise show discrepancy and block repeats until recheck. Keep audit reasons, consent confirmation, active vs revoked, and guest/role separation. |
| `Administration.vue` | Opening an account editor left keyboard focus in the directory; older identity badges and Save action were more filled than necessary. | Focus the role editor's account ID field on selection; closing returns focus to its origin. Use elegant outlined monograms, muted role labels, a compact 40px transparent Save action, stable side-by-side desktop / stacked tablet layout. No changes to grant/revoke logic or permission checking. |
| `ResearchIdentityCard.vue` | Large gradient avatar and ornamental card shadow detracted from verified professional identity. | Replace with a 42px outlined monogram, reduce ornamental shadow and container chrome, retain all role, identity, affiliation and verified source provenance facts. |
| `midnight-workspace.css` | Authenticated profiles, invitation composer, guest operation, contextual information and role editor still contained light backgrounds or low-contrast text in optional Midnight mode. | Scope original Midnight semantic surfaces, inputs, help popovers, action focus, directory rows, statuses and identity hierarchy to `.app-frame[data-nfq-theme=midnight]`. Default Daylight is unchanged outside named component refinements. |

## Scientific and authority invariants

- Invitation emails go privately through the existing server-managed Supabase Auth flow. **No invitation emails were sent as part of this PR.** An accepted dispatch does not itself prove delivery or grant a research role.
- Only a verified FQ Administrator can access invitation, directory, role and external Guest designation controls. Reviewer, Contributor, Guest and Unassigned remain outside this surface.
- Research membership, independently verified professional affiliation and external Guest designation remain distinct. No new rights, provider privileges, database writes or authorization shortcuts.
- The existing unconfirmed invitation same-session retry blockade and independent confirmation checkbox remain intact.
- No modification to CFTR variant classes, recorded ETI/Alyftrek response, all five therapies, historical original criteria, research source validation, Helios review gates or neumDESK.
- Original HTML left untouched. No prod deployment implied by merge.

## Verification

Automated `account-profile.spec.ts` expands the existing synthetic Administrator/Contributor/Reviewer/Guest/Unassigned account fixtures with:
- Invitation email autofocus, Escape/Cancel focus return, reset, no unauthorized dispatch, quiet controls and midnight appearance.
- Exact, server re-read Guest status with persistent confirmation on designation and revocation. Mismatch blocks subsequent changes until explicit recheck.
- Permission editor identity focus and close return, disabled Save until independent explicit confirmation, responsive 320/390/768/1366px containment.
- Mobile `(i)` context panel top-layer/hit-test and Escape focus restoration, in Daylight and Midnight.
- Existing account role assignment, duplicate prevention, uncertain deliveries, source review, invitations and guest contract tests continue unchanged.

Full Vue/TypeScript, functional parity, legacy integrity, non-deployment guard, connected five-therapy browser and clinical browser workflows must all succeed before merge. Manual screenshots under real authorized accounts are still a distinct production acceptance gate.

## Next engineering gate

**14H137C6 should become an end-to-end authenticated workflow audit**, including real-browser role transition semantics, invitation delivery status and activation, source-review queue ergonomics, z-index/focus/scroll behavior, and verification of the current deployed Vercel build. It must rely on actual authorized test accounts and must not presume permission to send invitations or change research access.
