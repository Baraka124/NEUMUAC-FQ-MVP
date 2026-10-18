# Phase 4F-12Z — Filtered research documentation CSV

NFQ-027 remains Partial; NFQ-029 remains Not migrated.

The Research coverage view can export all records matching the current documentation filter from a complete, successful read of the accessible catalog. It is not restricted to the first 40 visible records. CSV fields include source record identity and nomenclature, recorded reference-link counts and counts of links without a recorded source name.

Export fails closed for empty or over-5,000-record results, malformed or duplicate record IDs, invalid counts and inconsistent per-source breakdowns. Text is quoted and protected from spreadsheet formula execution. The export is not a global publications survey, evidence-quality assessment, clinical-priority score or patient-level report.

The feature performs no extra network requests, backend writes, geographic activity logging or user-location collection. Live-data verification is still needed to confirm counts and browser downloading. Tests exercise the pure CSV generator and the disconnected responsive interface.
