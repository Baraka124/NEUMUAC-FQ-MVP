# Phase 14H18 — Five-regimen differential acceptance and migration gap register

**Scope:** NFQ-014, NFQ-015, NFQ-024, NFQ-025, NFQ-026, NFQ-038. This is a rigorous **partial functional acceptance** stage. Do not label the entire original platform or five-therapy migration as complete.

## Automated engineering acceptance

| Original behavior / negative control | Modern check | Expected | Verification |
|---|---|---|---|
| Five distinct regimen identities | Canonical THERAPIES | Exactly 5, with regional brand aliases collapsed | therapyRegistry tests |
| F508del/F508del | Independent original-rule scenario | ETI tier match, Symkevi and Orkambi original rule match | phase14H18Parity |
| F508del/G551D | Independent scenario | Ivacaftor & Symkevi original rule match; Orkambi not matched | phase14H18Parity |
| F508del-looking compound name | Strict nomenclature negative | Do not treat a substring as exact F508del | phase14H18Parity |
| Kalydeco mutation D110H vs D110E | Name-list differential | D110H matches original list; D110E does not | phase14H18Parity |
| Class I exceptional ETI response | E831X vs G542X | Preserve both distinct responses, no class-based overwrite | phase14H18Parity, classIReviewSignals |
| Class I Alyftrek clinical-trial tier | 3120+1G>A with G542X | Alyftrek original trial-tier rule matches, ETI evidence unresolved | phase14H18Parity |
| Missing class or source proof | Absent/unknown tier controls | Return needs-evidence; do not invent a drug response | phase14H18Parity |
| Research source read fails | GET-only adapters | Explicit error/retry, no fake result | existing source unit tests and live checks |
| Mobile result below viewport | Jump-to-results + return focus | Visible action, screen-reader focus, reduced motion | clinical-foundation / opt-in live browser checks |
| Jurisdiction/safety legacy registers | Active-source reads | Four EU entries, Orkambi gap, interaction drugs distinguished | drugReferenceSource tests |

This suite is independent of the production Supabase values: it uses frozen legacy-derived input cases and hardcoded expected outputs, not a circular comparison of one new implementation against itself.

## Production acceptance gates — not yet passed

1. Verify new commit deployed at **https://fq.neumact.org** and compare actual desktop/mobile screenshots at 1366, 768, 390, and 320 px.
2. Run read-only opted-in browser tests: `NFQ_LIVE_ACCEPTANCE=1 npm run test:e2e:live` from `apps/clinical-web`. The suite explicitly checks that variants 1, 19, 35, 86, 351 retain original classifications, and that selected-pair navigation, review access and source reads behave correctly. Do not treat an opt-in file's existence as execution.
3. Reconcile all 16 exceptional-subtype Class I rows and three Alyftrek-only Class I records against production and saved original query snapshots; investigate drift before release.
4. Verify response-evidence attribution, incomplete ETI/Alyftrek citation links, current jurisdictional criteria and safety information with qualified scientific reviewers.
5. Independently approve whether any genotype phase, patient-level therapy matching or clinical switching guidance should ever be presented. The current UI compares **research records**, not a patient's genotype.
6. Verify authorized review submission, correction, audit trail and Helios approvals separately. A downloaded Markdown brief is not an approved clinical decision.
7. Confirm error recovery with disconnected, denied and stale API reads. Check keyboard focus after source disclosure, navigation and retry.

## Acceptance status

- **Engineering differential tests:** subject to pull-request CI.
- **Production data/read/browser checks:** **pending**.
- **Clinical scientific approval:** **pending**.
- **Full legacy functional parity:** **not achieved**. Open original capabilities remain documented in `docs/plans/LEGACY-FUNCTIONAL-PARITY-REGISTER.md`.

No production database writes, new service, paid staging environment, or geographic hit/miss recording are involved.
