# Phase 4F-13A — Recorded research chronology contract

**Parity:** NFQ-021 remains Partial, NFQ-028 review history remains only partially represented. The frozen original included variant timelines; the modern version already retrieves bounded, redacted validation and contradiction records.

A pure read-only chronology contract now separates events with credible UTC-normalizable timestamps from events without a recorded date. The former are ordered newest-first; undated entries are grouped separately and never assigned inferred dates. A recorded conflict with a detection date and a recorded resolution date produces two distinct lifecycle events, rather than treating the eventual resolved state as true at detection time.

The renderer must fail closed for mismatched variant identity, duplicate record IDs, malformed or timezone-ambiguous dates, impossible ordering where recorded resolution precedes detection, missing required state, and over-bounded inputs. It must not infer review actor, independent audit integrity, biological causality, actual scientific correctness, or clinical decision.

This is a **domain-only** phase with unit tests. The UI will be integrated in 13B after this PR is merged and verified. It does not change the existing history read surface or production database, authorization, records, geography or backend operations. Production timeline data acceptance remains outstanding.
