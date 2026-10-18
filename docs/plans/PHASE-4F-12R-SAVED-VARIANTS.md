# Phase 4F-12R — Saved CFTR research variants (NFQ-038 / V04)

**Source parity:** frozen original `index.1.html` lines ~14833–14852 (browser-local bookmark toggles) and ~23234–23310 (saved-variants panel, CSV export). Original used browser localStorage key `helix_bookmarks_v1` and exported cached scientific labels.

## Implemented
- A compact **Saved** disclosure inside the Variants rail, not a new navigation destination.
- A discreet Save/Saved action for **fully retrieved** individual variant records. Search-result-only previews cannot be saved as authoritative dossiers.
- A bounded worklist of up to 40 canonical positive decimal variant IDs, stored locally in this browser only. Duplicates, invalid IDs, leading-zero IDs, arbitrary query strings and malformed storage are discarded.
- Opening a saved item navigates to the existing verified record route; labels only use the currently loaded record, otherwise display its numeric ID. This does not claim an old cached classification remains current.
- Removal, empty state and CSV export of **record IDs and application routes only**. No locally cached source claims, protein nomenclature, patient context, email or geography is exported.
- Storage failure reports that nothing was saved. No server requests are made to create/remove bookmarks. No geolocation, search logging or Geographic Atlas counts are affected.

## Explicit limits
- Worklist is **browser-local and shared by anyone using the same browser profile**; it is not account-synced or a clinical record. Clear browser data to erase it.
- The existing original `helix_bookmarks_v1` is intentionally not automatically imported because it has unvalidated historical types/identifiers. Future migration would require source validation.
- Original named/classification-rich CSV has **not** been recreated. Scientific fields must be freshly retrieved and validated before a richer export can be considered.
- No synthetic scientific data or mutations of Supabase tables. Only test-only IDs appear in automated tests.
- **NFQ-038** remains Partial (responsive UI); **V04** remains Partial (safe saved worklist and ID export, real production acceptance outstanding). Does not complete any NFQ clinical validation gate.

## Verification gates
- Unit: canonical IDs, duplicate removal, malformed storage, max capacity and CSV injection resistance.
- Browser: accessible Saved disclosure, empty state, safe worklist reopening, no lateral overflow on desktop/tablet/mobile, no dependence on catalog when disconnected.
- Production acceptance: select two genuinely accessible CFTR records, save/reload/reopen/remove and export; confirm no geographic event logging and intended cache privacy disclosures. CI alone is insufficient.
