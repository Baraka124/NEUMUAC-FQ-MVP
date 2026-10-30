# Phase 14H15 — Five-regimen pair-rule research engine

**Implementation:** exact-name and recorded-evidence rule reconstruction based on frozen `index.1.html` lines 36957–37087 and 37936–38023. The new component appears in the existing two-record Genotype workspace only when both genuine variant IDs have been selected.

Original five regimens: ETI (Trikafta/Kaftrio), Alyftrek, ivacaftor (Kalydeco), tezacaftor/ivacaftor (Symdeko/Symkevi), lumacaftor/ivacaftor (Orkambi).

- Exact F508del naming only, no substring matching. Original ivacaftor named-list restored, including D110H but not D110E.
- ETI response requires a recorded qualifying evidence tier (`clinical_trial`, `frt_assay`, `fda_approved`), or the original explicit Class II + `class_rule` combination. If original `ETI_AUTHORITY` name-list verification is absent, the result is **needs evidence**, never a negative eligibility claim.
- Alyftrek direct clinical-trial tier takes precedence over the original non-Class-I heuristic, preserving Class I treatment-response exceptions. Other class-rule matches are explicitly marked as historical research rule matches, not current indications.
- A Class I exceptional subtype never rewrites a therapy-specific response.
- Display wording: **Rule matched**, **Rule not matched**, **Evidence check needed**. These are historical rule outcomes, not prescribing eligibility; no patient genotype or phase inferred.
- Exact read-only pair sources, abort on selection changes, descriptive errors and retry. One restrained table with optional source explanations.
- No writes, approvals, regulatory guidance, or geographic events.
