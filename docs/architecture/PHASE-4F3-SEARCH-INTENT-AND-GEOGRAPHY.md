# Phase 4F-3 — Scientific search intent and geographic research

**Design:** Search-as-you-type stays independent of logging. This phase adds a pure, non-persistent *candidate* classifier; it does not write to search_logs, access browser GPS, query institutions, or add patient-location questions.

1. Browse, incomplete or narrative text, pasted contacts/URLs and test-like words do not create scientific misses. Search remains available when permitted by the existing discovery layer.
2. A catalog match is a **hit candidate** only after a completed, qualified, server-confirmed search. A no-match for plausible notation is a **miss-review candidate**, never a novel variant. Review can classify invalid nomenclature, alternate alias, catalog coverage gap, or scientific follow-up.
3. The current heuristic must NOT be treated as fully validated HGVS. Later use a scientific nomenclature parser and verified variant identity, along with a trusted telemetry boundary and explicit collection policy.
4. Do not log each keystroke. Debounce and accept a deliberate stable search event with deduplication and environment context. No automatic patient-region attribution.
5. **Geography interaction:** offer the optional action “Explore regional research activity” linking to the Geography lens, not “see patients with this variant near you”. The aggregate map must not display rare-variant regional counts unless a privacy-reviewed server supplies safe, thresholded data.
6. Distinguish **event geography**, **verified institution**, and **patient region**. Patient region should not be collected by ordinary search. If a later separate patient-linked research protocol justifies such collection, it requires data minimization, consent/lawful basis, institutional governance, purpose and access controls and cannot be mixed into the general analytics map.
7. Supabase raw search_logs currently has broad anonymous read access. No browser read of raw search or location tables is permitted; require privacy-safe aggregated services and security remediation before shipping any geographic statistics.
8. Any geo-map query-level breakdown must use approved normalization, small-cohort suppression and controls against differencing. Historic Galicia and Tanzania testing must not be mislabeled clinical demand.

**Permission signals emerging from actual workflows:** view protected research aggregates; review candidate nomenclature; resolve candidate catalog miss; verify institutional affiliation; govern source collection and publication. Exact grants will be decided once implementations and institutional review exist.

**Acceptance:** unit tests prevent random text and service errors from generating scientific misses; integration only after the separately reviewed telemetry and authorization boundary exists.
