# neumuacFQ · 14H198–199 · Independent expert benchmark adjudication

This change builds on 14H194–195 real-publication challenge registry (PMIDs 22047557, 31697873, 33375403) and the existing independently reviewed source-claim register.

## 14H198: independent expert extraction
- Accepts **at most two** distinct external reviewer submissions for one exact publication and internal variant ID.
- Each submission must record PMID, source locator, genotype context, experimental model/cohort, endpoint, qualitative interpretation and methodological notes.
- Rejects reused reviewer identities, mismatched article/variant IDs and incomplete extraction details.
- Detects disagreement without merging or averaging interpretations.

## 14H199: adjudication and fail-closed comparison
- Disagreements require a third distinct identity and a traceable adjudication rationale.
- The engine does **not** assume authenticated reviewer identities: those must be verified by an authorized backend before submissions become trusted records.
- A separate attested mapping is required to compare adjudicated findings with approved platform source claims. There is deliberately no automatic inference from a clinical trial to a single-allele mechanism, modulator benefit or patient eligibility.
- No external expert adjudication has actually occurred. Test identities and statements are synthetic software fixtures only.
- All results carry `independentlyValidated:false` and `clinicalDecision:false`. They must not be displayed as approved real-world reference outcomes.

## Required follow-on integration
1. Backend-authenticate expert reviewer identities, prevent self-review, preserve immutable time-stamped submissions and audit events.
2. Build an explicit adjudicator-approved claim mapping using the existing reviewed claim identifiers, scientific endpoint definitions and genotype scope.
3. Add the comparison results to the existing research workspace only after the authenticated read API is available. Do not add UI mock data.
4. Execute full application unit tests and TypeScript build in CI; the current connector-only edit has not run those commands.
5. Invite appropriately qualified domain experts to curate primary-source interpretations. A bibliography or automated test is not scientific validation.
