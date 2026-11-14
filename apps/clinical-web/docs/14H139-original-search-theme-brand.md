# 14H139 · Original search proportions, Midnight continuity and logo fit

## Resume V7 at the owner's last reported defects

The last V7 screenshots revealed search controls that still appeared too stretched or
filled, pale areas after changing appearance, and brand artwork visually undersized
inside its intended slot. This is a **targeted UI continuation**, not a redesign:
the original owner-provided `index (85)(1).html` remains untouched. Preserve the
five therapy interpretations, recorded ETI/Alyftrek findings, exceptional Class I
behavior, live catalog search, provenance, access permissions and audit history.

## Changes

- **Overview:** its dedicated search row is bounded at 540px instead of 640px.
  Existing 42px input, transparent 40px submit action, Enter submission and query
  navigation to `/variants` are unchanged.
- **Administration:** account-directory search is bounded to 440px rather than
  570px. The account filter, verified server search, role authority and invitations
  are untouched.
- **Brand:** the original square transparent PNGs are displayed more accurately
  through component-specific framing. Desktop sidebar artwork is centered and
  enlarged *within* the existing brand slot. Public landing wordmark gets a
  dedicated responsive frame. No logo file edits or new remote assets.
- **Midnight:** named remaining light-background sections of research access,
  directory rows, role form, search help, saved variants and search feedback now
  use the established original Midnight semantic surfaces. No global color
  inversion or replacement of CFTR classes, recorded response/status colors or
  evidence confidence.
- **Tests:** new unprivileged Chromium visual-contract checks at 320–1600px for
  bounded search, keyboard-equivalent submit/navigation, appearance and brand
  loading; separate synthetic Administrator test checks visible access panels
  and role-editor theme, without dispatching permissions or invitations.

## Verification and release boundary

Run `npm run typecheck`, `npm test`, `npm run test:e2e`,
`npm run test:e2e:curation`, `npm run test:e2e:contract`, and existing
functional-parity/legacy checks. CI browser tests and manual deployed screenshots
in both appearances remain necessary; successful source commits are **not** proof
that production was rebuilt or deployed.

No database migration, authentication-policy change, source publication, real
research record update, active invitation, external service, or neumDESK change.
