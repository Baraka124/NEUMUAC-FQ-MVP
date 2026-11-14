# 14H146 — governed research oversight and full-shell theme continuity

## Intent
Replace /governance placeholder with a reviewable, source-bound oversight
workspace. Deliver the owner's premium quiet outlined interactions and both
original color signatures without altering any clinical classifications.

## Server/role contract
- "Verified role" is shown only for an active account whose **researcherRole**
  assignment was explicitly verified. A signed-in user or a verified Guest
  designation is not sufficient. The displayed UI eligibility is NOT a server
  permission grant.
- Membership management is linked to existing independent administrator
  authorization. Source correction review is linked to existing independently
  authorized reviewer/administrator flows.
- When and only when signed-in role and client configuration permit a review
  attempt, the existing source-correction review queue is fetched as GET,
  with an account-token/identity guard and server-side RLS. A successful
  response displays a bounded page of submitted correction metadata. No
  author UUIDs, free-text notes or decisions are displayed, and no cross-page
  aggregate counts are invented.
- When auth or role changes, outstanding loads are cancelled, previous
  records are erased and the view becomes restricted. Access denied,
  unexpected schema or truncation never becomes an empty verified queue.
- All actual scientific approvals, role changes and invitations remain in
  their existing protected admin workflows. Governance introduces no writes.

## Footer
- Main shell is min-height 100dvh with flex-growing page body.
- The unobtrusive footer uses the standard **flex-layout sticky-footer**
  pattern: anchored at the viewport bottom on a short page, after all content
  on a long page. It has **no position:sticky or fixed overlay**, because those
  would intercept search preferences, filters and review actions.
- Phone safe-area inset and compact type/padding are respected; auth landing
  routes are excluded.

## Theme consistency
- Last-loaded stylesheet owns the Daylight/Midnight footer, Governance page,
  contextual (i) help popover, modal/backdrop and shared mobile layer accents.
- The original midnight ink/paper/soft/navy tokens are reused, not new accent
  colors or blanket color inversion. Existing scientific status, functional
  class, therapy response and exceptional Class I semantics are unchanged.
- Mobile 320px, 390px, 430px, 760px and desktop up to 1366px regression
  checks include footer geometry, switch/toggle persistence, multiple research
  routes, popover surfaces, menu and switcher consistency and zero overflow.

## Validation
- TypeScript + Vitest role boundary tests, full clinical browser smoke and
  connected five-therapy contract, original legacy integrity, functional
  parity and nondeployment gates.
- No neumDESK, Supabase, role assignment, research data, API implementation
  or release identity modification outside Vue frontend.
