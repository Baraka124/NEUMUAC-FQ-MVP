# Phase 4F-12S — Portable source-identity links (legacy V02 / V04)

**Legacy comparison:** frozen `index.1.html` `generateVariantQR` (~line 14433), `exportBookmarkedVariants` (~line 23305) and browser bookmarks (~line 14835). Their user value includes navigating directly to a recorded scientific identity and taking a bounded saved worklist to another browser. This phase restores safe **direct links**, not QR generation or rich scientific export.

- Each selected, fully retrieved variant shows a discreet **Copy link** control adjacent to Save. The link contains only the source record ID as an application hash route, not patient content or recorded classifications.
- The link builder strips search parameters, fragment queries, account context and untrusted text. Only canonical positive decimal record IDs and HTTP(S) application origins pass.
- Saved-variants CSV is now a portable two-column file (`variant_id`, `record_url`) with full canonical source routes. URLs are properly quoted for CSV compatibility.
- A link is a pointer to a record; it is **not** a verified nomenclature synonym, source quality verdict, clinical report or promise of future access.
- Failed or unsupported clipboard access produces clear feedback; it never claims the link was copied.
- No third-party URL-shortener, new QR dependency, location capture, search telemetry or backend/database write.
- The geographic-activity recording policy remains disabled by default and unaffected by navigation/share links.
- No synthetic production scientific data. Unit tests cover URL identity, stripped browsing context and unsafe inputs; browser tests cover unavailable records and saved-link controls.
- **Still outstanding:** original QR rendering, rich saved-record exports with live verified fields, production real-record end-to-end acceptance, and accessibility checks beyond existing browser tests. V02 and V04 remain Partial.

No new sidebar destinations; these are natural utilities in the Variants record and existing saved-worklist panel.
