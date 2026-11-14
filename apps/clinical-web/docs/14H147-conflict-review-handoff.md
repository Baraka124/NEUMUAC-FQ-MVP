# 14H147 · Recorded contradiction → source-bound review preparation

## Why this phase

14H145 brought a real single-variant Reports & Audit chronology; 14H146
introduced Governance's verified-permission and submitted-proposal oversight.
This phase connects the existing, already unit-tested unresolved-conflict
packet preparation to real complete-variant evidence retrieval. It is a
**research context handoff**, not a new clinical decision system.

## Connected workflow

- Governance: a successfully loaded RLS-authorized pending source-correction
  row links to the exact variant's recorded history, scoped evidence and dossier,
  without embedding identities or private notes in URLs.
- Reports & Audit: only after the selected variant and its complete, consistent
  validation+contradiction chronology load does a new source-bound review
  section appear for actual unresolved contradiction records.
- Records are identified by original conflict ID and stored field/severity
  metadata. Resolved records are omitted. Severity is not treated as a
  clinical priority, review status or authorization.
- A human clicking "Prepare source context" triggers one read-only, variant
  scoped, bounded fetch of all accessible evidence_links. The 201st row,
  cross-variant results, duplicate reference IDs, malformed references,
  inaccessible server or inconsistent history **fail closed**.
- The generated Markdown review-preparation packet contains only unresolved
  metadata and the whole retrieved candidate citation list. It states that
  links are **not evidence for a particular contradiction** and requires
  independent review. It does not claim approval, change a record, assign
  review responsibility, export reviewer identities or expose patient data.
- An explicit second click downloads the prepared packet, filename scoped
  to the verified positive record ID. The packet is removed immediately
  on route scope, record identity, history changes or unmount.
- Evidence & provenance: variant-scoped source browsing can return directly
  to the same variant's recorded history.

## Integrity, permissions and UX

- Reuses existing createLiveEvidenceSource.forVariant,
  recordedConflictFocus and prepareConflictReviewPacket. No new backend
  endpoint, authorization bypass, fabricated records or indirect POST.
- The original V7 Daylight and Midnight signature carries over; buttons stay
  quiet, compact and outlined; the panel is a single narrow surface that
  stacks naturally at 320px.
- The Phase 14H146 flex-layout footer remains untouched, never overlays
  focus or filter controls, and does not receive pointer input.

## Acceptance

- Unit tests: no resolved-only packet; incomplete, cross-variant, duplicated,
  non-HTTPS source records fail closed; malicious Markdown headings/line
  breaks stay escaped text.
- Contract browser: real variant/history/reference GET chain, file
  content and filename, denied/rejected/truncated reference sets, legitimately
  empty reference register, route reset, scoped evidence return, Midnight phone
  rendering and zero horizontal overflow.
- All legacy integrity, connected five-therapy ETI/Alyftrek, scientific parity,
  TypeScript, test suite, browser smoke and release gates before merge.
- No neumDESK, Supabase schema/policies, production records, Helios decisions,
  deployments or privileged identity writes in the PR.
