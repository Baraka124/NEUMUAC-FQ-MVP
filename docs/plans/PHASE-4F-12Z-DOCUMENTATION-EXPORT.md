# Phase 4F-12Z — Complete filtered documentation worklist export

**Functional register:** NFQ-027 Partial; NFQ-029 Not migrated; NFQ-038 Partial.

A user-initiated **Export matches · CSV** from Research coverage will download all currently filtered records from a complete successful read of the accessible variants and evidence-links registers, not only the first 40 visible rows.

- Fields: recorded variant ID, recorded name, protein and cDNA notations, total **recorded reference-link count** and the number of those links missing source-name metadata.
- Input is the existing complete in-memory coverage snapshot only. No additional endpoint calls, patient information, historical search behavior, regional/geographic metrics or database writes.
- Exports are bounded to 5,000 matching records. Over-limit, empty, duplicated, malformed ID, negative link count or internally inconsistent per-source counts must fail closed; the UI provides clear feedback.
- UTF-8 quoted CSV with formula-prefix defenses. No inferred scientific score, pathogenicity, missing-publication finding, researcher urgency or clinical recommendation.
- The filtered set can include variants with links or without links depending on the active filter. This is not a globally complete survey of all CFTR publications; only accessible catalog associations.
- No extra sidebar destination or redundant heading. Keep status/explanatory text compact, with broader limitations already documented in contextual help.
- Production acceptance needs a complete real-data read, matching filter/export row counts, secure browser download and responsive desktop/mobile checks. Tests alone do not certify those conditions.
