# neumuacFQ — V1 coverage and scientific release gates

This ledger tracks the **entire** established platform. Completing a new phase
must not remove, replace or silently degrade earlier capabilities. This is not
a clinical-validation certificate or a declaration that all requirements pass.

## In-scope workstreams to preserve and verify

| Workstream | V1 acceptance boundary |
| --- | --- |
| Canonical CFTR variant identity | Exact cDNA/protein/legacy notation, alias provenance, and no false equivalence of similarly named variants (including 1716G/A vs 1716+1G>A). |
| Variant search and case exploration | Accurate exact match and variant navigation; search/filter controls do not obscure results; original approved look and feel is retained. |
| Five independent therapy rules | Ivacaftor, lumacaftor/ivacaftor, tezacaftor/ivacaftor, ETI, and Alyftrek remain explicitly separate and source-specific. Existing legacy responder logic is not silently replaced. |
| Scientific evidence curation | Exact original source, study family, assay, genotype scope, endpoint, statistical uncertainty and population identity retained without invented values. |
| Revisions and double review | A source claim needs two independent approvals; molecular interpretation needs its own two independent approvals; submitting users cannot self-approve. Historical revisions and scientific rationales remain traceable. |
| Molecular workbench | Research annotations, revisions, evidence gap visibility, source-original navigation and approved-only exports remain accessible for a *single* variant, without forcing a cross-variant comparison. |
| Cross-variant comparison | Independently loaded, exact identities; study provenance and genotype context explicit. Similar class, different labels or shared mechanisms never assert equivalent clinical response. |
| Scientific reconciliation | Compare real double-approved source claims; distinguish shared/overlapping study families, experimental comparability and unresolved source questions. Draft reconciliations are **not** approved evidence. |
| Geographic research coverage | Direct per-variant atlas shortcut, authentic source geography where provided, and separate geographic research-activity information; a missing location is not silently inferred. |
| Permissions and account roles | Admin, contributor/researcher and reviewer/guest views maintain least privilege; server RPCs enforce active-session research memberships, not UI visibility alone. |
| Scientific research exports | Exact citations, source revisions, approvals and limitations; pending/local drafts excluded from approved-only exports; no invented metrics or treatment predictions. |
| UX and accessibility | Quiet clinical editorial styling, compact controls, responsive desktop/tablet/mobile, keyboard focus and low-density panels; preserve original approved branding and logo placement. |
| Clinical governance | No patient-specific treatment recommendation, cohort ingestion or clinical deployment before relevant ethics, data protection and medical-device governance review. |
| Reliability and regression protection | TypeScript/build/unit tests, three browser shards, five-therapy connected contract, original legacy integrity and nondeployment safeguards all pass. |

## Remaining phase plan

- **14H199–200 — Source-specific reconciliation:** side-by-side reviewed publication comparison and exportable, explicitly unreviewed source questions.
- **14H201–202 — Research collaboration:** controlled persistence, independent review handoff and provenance for source-reconciliation notes, only after permissions and review model are validated.
- **14H203–204 — Research-gap/hypothesis intelligence:** distinguish questions grounded in reviewed source evidence from exploratory suggestions; no automatic biological or drug-response conclusion.
- **14H205–206 — Real-account scientific acceptance:** actual authenticated contributor and two distinct reviewers; genuine source publication, exact identity, approval and revision lifecycle; no synthetic patient data or fabricated evidence.
- **14H207–208 — Comprehensive UI/UX and accessibility:** all existing modules, panels, atlas and interactive areas, responsive and keyboard-tested; recheck original design parity.
- **14H209–210 — Security/performance:** least privilege, abuse/race limits, source integrity, audit immutability, load/boundary tests, evidence import and export restrictions.
- **14H211–212 — Final V1 research acceptance:** canonical workflows, original five-therapy contract, geography, metadata quality, runbooks and operational signoff.

## Evidence and claims

A passing automated pipeline verifies code and regressions, **not** biological
validity, patient treatment eligibility, patentability or genuine clinical
adoption. Do not introduce synthetic scientific findings just to populate an
empty register. Real-world acceptance depends on authorized researchers
submitting and independently reviewing actual scientific sources.

Do not claim the project is 100% finished while any applicable above acceptance
gate remains unverified. Preserve this ledger in future phases, including work
on the source-reconciliation, molecular, geographic and therapy modules.
