# Phase 4F-13C — Dossier provenance acceptance and neumDESK boundary

**Status:** Read-only architecture and acceptance contract; not implemented clinical functionality.  
**Starting evidence:** Phase 13A/13B merged as PR #166/#167; legacy parity register remains the capability source of truth.  
**Parity:** NFQ-007, NFQ-009, NFQ-020 and NFQ-021 remain **Partial**; NFQ-018/019/022/023 remain unverified or staged. This document does not change their statuses.

## 1. Scope and the scientific task

For one **real, nonidentifying** recorded CFTR variant, a researcher should be able to distinguish (a) its canonical recorded identity, (b) the source and freshness of each scientific assertion, (c) dated vs undated historical records, (d) a detected conflict vs a separately recorded resolution, (e) missing data vs unavailable data, and (f) the next permitted research action. Do not conflate a recorded classification with a validated clinical decision.

13A/13B provide a defensive, redacted chronology model and dossier disclosure, **not** an independently verified audit log, restored reviewer workflow, clinically adjudicated evidence, or production acceptance.

## 2. Actual current interfaces and boundaries

- Modern CFTR frontend: `apps/clinical-web`; production root build is currently published through the repository cutover workflow, with frozen `index.1.html` retained as the legacy functional comparator. GitHub success does not establish deployed database access.
- Scientific evidence source: existing CFTR research data and only the approved read projections; no speculative CFTR2/ClinVar federation, implicit scores or invented source versions.
- Helios: public-facing read protections do not become safe because a client decoder strips fields. Deny by default without a verified authorized server projection and RLS. No live decisions or claims without server-side governance.
- Geography: a text suggestion, partial search, dossier navigation, chronology expansion, permalink open or export is not by itself an intentional confirmed search; do not generate location events from these interactions.
- Report/links: worklist or dossier exports reproduce recorded references and their stated limitations; no patient, researcher identity or privileged review metadata.

## 3. neumDESK is the institutional parent context, not the CFTR scientific database

**Authoritative context:** neumDESK (`desk.neumact.org`) manages the neumACt research group's departmental activities, innovation projects and clinical studies. neumuacFQ (`fq.neumact.org`) is a distinct CFTR-focused research platform and may be represented there as a governed **clinical-innovation project**.

| Concern | Authority | Allowed future integration | Must NOT happen |
| --- | --- | --- | --- |
| Innovation project identity, stage, research line and team relationship | neumDESK governed project record | Approved project link/reference and non-sensitive, explicitly public project summary | Duplicate editable project database inside neumuacFQ; infer project governance from its scientific records |
| CFTR variant identity, evidence, source links and chronology | neumuacFQ source and verified scientific authorities | Explicit non-sensitive contextual link from project to CFTR workspace | Treat neumDESK project metadata as variant evidence, classification or clinical approval |
| Staff identity and institutional roles | Each application's verified server authorization until a separately designed federation is approved | Later documented identity mapping with least-privilege tokens and separate permissions | Reuse neumDESK JWT, user role, staff ID, UI badge or department-head status to bypass neumuacFQ review authorization |
| Contributor / reviewer approval | Authorized neumuacFQ server-side scientific review workflow | Separately approved cross-system audit metadata, if a real need is established | Treat project membership, sharing or staff directory presence as curation / reviewer certification |
| Patient or location information | Outside this integration's scope | None | Patient-level transfer, geography derived from patient origin, staff location or silent cross-system tracking |
| Public communication | Governed neumDESK-to-neumact.org publication channel | Explicitly approved public project description/link | Automatically publish CFTR research assertions or draft reviewer decisions |

The neumDESK project-sharing concept is explicitly **deferred** (see its `docs/mi-espacio-phase36-deferred-project-sharing.md`); it is not permission to implement sharing in either application. Its research governance proposal separates study presence, lifecycle, ethics/governance evidence, recruitment and readiness. Apply the same non-conflation principle here.

**No cross-repository code, API endpoint, schema, RLS policy, token exchange, single sign-on, publishing automation or data sync is authorized by Phase 13C.**

## 4. Acceptance matrix before further UI / service implementation

| Case | Expected behavior | Validation level |
| --- | --- | --- |
| Exact confirmed recorded variant | Dossier opens for same canonical identity; source scope remains visible | Domain tests + real-data browser verification |
| Partial, suggested, ambiguous or unsupported search | Suggestions only; no automatic scientific canvas hit or geography event | Search regression + browser |
| Dated conflict and later resolution | Distinct UTC events in newest-first chronology, not retrospective resolution | Existing 13A unit contract + browser |
| Unknown date | In explicit undated collection; no fabricated timestamp | Unit + browser |
| Malformed / duplicate / mismatched history record | Fail-closed inconsistency, no partial authoritative-looking history | Unit |
| Empty history vs failed/denied read | Distinct factual states; never label unavailable history as empty | Service + browser |
| Public user requesting private Helios material | Denied before confidential payload reaches browser | Server/RLS penetration-negative tests in authorized staging |
| Evidence link / share link / CSV | Validated scope, bounded data, accurate source origin; no identity/PHI | Unit + browser + export inspection |
| neumDESK project absent or inaccessible | No invented project relationship, no scientific dossier failure | Contract test if integration later authorized |
| Authenticated role differs between applications | No transitive review, publication, or database privilege | Server authorization tests prior to integration |
| Mobile and keyboard browsing | Chronology and disclosures readable, no page jumps, clipping or inaccessible chevrons | Real browser responsive/focus checks |

## 5. Next phase decision gate

A safe 13D should **first** inspect the actual Vue dossier, search and evidence components plus test coverage and list concrete mismatches against this matrix. Fix bounded UI or pure read-contract defects with regression tests. Do not introduce a new sidebar module, a duplicate project catalogue or mock scientific records. Independently confirm the live site deployment, anonymous/read-deny behaviors and any valid external source availability before claiming parity.

### Required merge discipline

Each implementation PR starts from current `main`, must name NFQ IDs, pass its required checks, and merge before a dependent phase begins. A documentation-only PR cannot be described as delivered UI functionality or live-system validation.
