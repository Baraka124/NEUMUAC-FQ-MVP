# 14H148 · Evidence-to-conflict traceability (local, provisional)

## Scientific boundary

The actual contradictions read-only source reports each contradiction's ID,
field, severity, status and timestamps, but it does NOT expose the detailed
opposing values or a verified link between a contradiction and a publication.
The evidence_links adapter returns variant-level source references, not
conflict-level evidence assertions.

Therefore: never invent a claim, cite a paper as proving a contradiction,
auto-assign a corroboration/disagreement, infer severity as research priority,
or claim a scientific verdict from matching variant identifiers.

## What is connected

1. Open a real variant in Reports & Audit and retrieve its complete, valid
   research chronology. An unresolved contradiction must be recorded.
2. Choose "Prepare source context" and wait until the entire trusted reference
   register has been read; failure, truncation (201+), mismatched variant or
   malformed references fail closed. This remains the 14H147 source gate.
3. Expand "Evidence-to-conflict traceability". Manually select an unresolved
   conflict and original reference, inspect the primary source, and enter:
   - the exact scientific question under examination
   - the locator to independently check (section/table/page/PMID/etc)
   - an author's working interpretation
   - a clearly labeled provisional relationship (possible corroboration,
     possible disagreement, context-only or undetermined)
4. Add up to 30 unique conflict-reference pairs. Remove individual working
   entries. Each source is displayed with its original, verified HTTPS catalog
   URL and available PMID/DOI identifiers, but the underlying claims remain
   unverified until independent review.
5. Export a **local-only** Markdown research worksheet, containing only
   explicitly entered mappings tied to real live IDs, original recorded source
   identifiers and caveats. This is NOT a review outcome, a published audit,
   a source correction, a server-side submission, or a clinical decision.

## Data and privacy

- No Supabase schema or role change, new network write, localStorage,
  sessionStorage, API submission, patient data, reviewer identity, timestamp
  or background persistence. Working notes exist only in the mounted Vue
  component and disappear on refresh, route change or source refresh.
- The source list remains unexposed until complete and validated.
- No new inference or modification to any of the five therapeutic regimens,
  class-I exceptional cases, ETI or Alyftrek logic.
- Portable output uses strict length and control-character validation, escapes
  Markdown structure and disallows stale/resolved IDs, forged source URLs,
  duplicate mappings, invalid values and incomplete research sources.
- The previous independent unresolved-review packet remains available and
  unchanged. Absence of linked references means no traceability worksheet.
- neumDESK, the old site, the footer and backend remain untouched.

## Visual contract

Extend the original white/blue research signature and Midnight palette.
Keep the traceability form folded until requested. Narrow, calm outlined
buttons, clear original source links, 16px native inputs on phones to avoid
zoom, no overflow or footer overlay. Source verification disclaimers remain
visible without filling the screen with banners.

## Acceptance gates

Pure unit tests and the connected Playwright browser contract must prove
positive mapping and export, empty-vs-denied references, no inferred links,
long/short notes, malicious Markdown, duplicates, stale and cross-variant
IDs, loss of state on route transition, no HTTP mutations, Daylight/Midnight
and mobile layout. Entire clinical full-suite browser and legacy parity gates
must remain green before merging and source-authenticated GitHub Pages rollout.
