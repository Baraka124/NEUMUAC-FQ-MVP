# Phase 4F-12X — Two-record comparison Markdown export

**Legacy function coverage:** NFQ-024 remains Partial; NFQ-031 stays In progress; NFQ-032 remains Not migrated.

The existing two-variant research comparison can download a deterministic Markdown record summary when both variants have been **successfully retrieved** and the bounded, complete reference requests for **both** variants have returned successfully, including true empty results.

- Contains each recorded ID, recorded names, protein and cDNA notations, aliases, and *all* currently returned linked research references up to the 200-record complete-view safeguard for each selected variant.
- Reference URLs and variant identities are checked again before output; duplicate reference IDs, mismatched variant IDs, non-HTTPS links and invalid records suppress export. Source text is Markdown-escaped; reference lists are sorted by ID.
- The record-only comparison does **not** contain patient identifiers, clinical genotype interpretation, allelic phase, pathogenicity inference, modulator responsiveness or treatment eligibility. Same-record selection retains a visible non-homozygosity warning.
- Export does not run new queries: it uses the two successfully completed record/reference snapshots already held by the comparison view. No partial/scientifically misleading downloads during read failures.
- Markdown is not a PDF clinical report, a reproducible server audit, or expert evidence validation. Production real-record and actual browser download acceptance remain pending.
- No database writes, external third-party telemetry, Geographic Atlas activity recording or extra sidebar modules.
