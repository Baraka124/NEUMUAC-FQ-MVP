# Phase 14H12 — Exceptional Class I regression and reviewer signals

**NFQ-014/015/020/025.** Preserve the source-recorded combination of functional class, subtype and therapy-specific response. The review engine only emits signals; it cannot rewrite a response, grant approval or make a prescribing decision.

## Read-only live inventory (2026-10-30)
- 1,103 Class I records; 16 have subtype `exceptional`.
- Fifteen exceptional records have `eti_prediction = responsive`; the remaining one (G542X, ID 19) is `non_responsive`.
- Three `true` Class I records have ETI `non_responsive` and Alyftrek `responsive` (IDs 35, 86, 351).
- Current `validation_count` is zero for all fifteen exceptional ETI-responsive records. Five have rows in `variant_evidence`; two have `evidence_links` records. These fields do not establish clinical validation.
- The original Helios rules exempt explicit exceptional subtypes from the standard Class I + ETI review alert. The original UI also used the subtype for search, annotations, filtering, and genotype interpretation.

## Delivered
- Pure review signal generator: unflagged Class I ETI response, exceptional subtype without corresponding ETI response, divergent ETI/Alyftrek labels, missing classification and zero validation count.
- Frozen regression fixtures with all 16 identified exceptional records and all three Class I Alyftrek-only records. Test fixtures do not mutate or populate the live database.
- Class I subtype never implies response. A drug response never overwrites the class or another drug's field.
- Alerts have no auto-correction, severity-as-truth, write action, or eligibility prediction.

## Next requirements
14H13 should render the five-regimen summary with accessible, sparse hierarchy and progressive evidence disclosure. 14H14 should connect these signals to a verified authorized review workflow, with preserved evidence citations, justification, reviewer identity and audit history. Current CI covers code semantics, not live clinician acceptance.
