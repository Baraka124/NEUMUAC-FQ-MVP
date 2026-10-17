# neumuacFQ — Functional recovery and research innovation roadmap

**Status:** Planning baseline after direct reading of frozen legacy `index.1.html` (blob `c18221fb6baf47782318ca3685b94b088c359a66`). Complements the immutable 38-item [parity register](LEGACY-FUNCTIONAL-PARITY-REGISTER.md) and [source reconciliation](../architecture/PHASE-4F-10L-LEGACY-SOURCE-RECONCILIATION.md). No capability is declared complete by this plan.

## Governing rule — do not discard a differentiating capability merely because the old UI or implementation is weak

For each feature: **Recover → Evaluate → Reimagine → Validate → Migrate**.

- **Recover:** identify source functions, user flows, inputs, outputs, dependent services and original working behavior.
- **Evaluate:** identify research value, originality, actual user task, data provenance, failure modes and governance needs.
- **Reimagine:** prefer an improved interaction/information architecture over cloning legacy overlays, giant cards, dark surfaces or duplicative headings. Preserve meaningful discovery and workflows.
- **Validate:** bound scientific inference, clinical intended use, identity, source provenance, privacy, RLS, auditability, accessibility and test coverage. Do not label historical heuristics as validated clinical predictions.
- **Migrate:** stage controlled changes, document NFQ status and compare the real system, old vs new, before retirement of any original behavior.

**Classification for every original capability:** Retain and modernize / Retain behind validation gate / Replace with justified equivalent / Explicit retirement only with documented owner approval. “Not yet safe to expose” is not synonymous with “delete”.

## Delivery roadmap (all scopes are proposals pending acceptance)

| Phase | Focus | NFQ IDs | Capability recovery | Required acceptance |
|---|---|---|---|---|
| **4F-11A–D** | Scientific search parity | 003–006 | Exact/alias/HGVS, positional/eponymic characterization, compound and mixed-hit states, useful miss feedback | Original differential cases, ambiguous non-equivalence controls, real variant records, no uncontrolled location logging |
| **4F-12A–D** | Dossier and evidence architecture | 007, 009–010, 014, 020–021 | Recorded scientific fields, chronology, reference completeness, confidence provenance and source context | Clearly distinguish database labels from adjudicated evidence; missing vs failed reads; professional scientific review |
| **4F-13A–C** | External source federation | 011–013, 015 | ClinVar, CFTR2, publication/DOI and external authority paths; source date/version and disputes | Verified source identity, licensing, CORS/rate-limits and cautious source-specific comparisons |
| **4F-14A–C** | Genotype research | 024–026 | Stable two-record comparison; evidence and nomenclature contrasts; uncertain/unknown states | No inferred treatment eligibility, phase, severity or sweat-chloride predictions without clinical intended-use approval |
| **4F-15A–D** | Curation and Helios | 008, 017–023, 036 | Proposals, review, disagreements, claim/release, history and accountable decisions | RLS and role matrix, transactional concurrency, immutable audit and rejection/revision flows verified before production writes |
| **4F-16A–D** | Research gaps, trends and observatory | 006, 027–030, 037 | Search misses, research priorities, publication coverage, aggregated geography | No patient locations, privacy minimization, metric denominators, opt-in and retention safeguards |
| **4F-17A–C** | Reproducible reporting | 031–033 | Scientific brief, dossier/PDF, structured research/ethics exports | Reproducible bounded references, source dates, redaction and appropriate template sign-off |
| **4F-18A–D** | Operations and release quality | 001–002, 034–038 | Import previews, idempotent retry, authorization, regression and end-to-end deployment acceptance | Permission-deny matrix, read/write separation, no synthetic production evidence, responsive and accessibility gates |

### Entry and exit criteria for each increment

1. Source-linked baseline and preserved user benefit, with NFQ IDs and existing modern behavior documented.
2. Small technical scope; no unapproved schema/RLS writes or inferred scientific authority.
3. Tests for success, ambiguous identity, missing evidence, retrieval failures, cancellation and responsive operation, as applicable.
4. Current UI principles: calm light institutional surfaces; disciplined hierarchy; no repeated headings; detailed explanatory prose under accessible contextual `i`; meaningful disclosure; proportional search/control surfaces; no gratuitous arrows, page jumps or nested scrolling.
5. Routine CI green before merge; deployed real-data acceptance separate; clinical sign-off where clinical inference or action is involved.
6. Update parity register truthfully; preserve useful legacy behavior until its replacement is accepted.

### Differentiating features to prioritize, not quietly remove

- Instant identity-aware CFTR search and original compound/eponymic discovery patterns (**scientific synonym equivalence must be established, not guessed**).
- Provenance-first multi-source evidence navigation and study-design metadata, while historical numerical quality heuristics remain nonvalidated.
- Collaborative curation, disagreement recognition, Helios review ownership and accountable chronology.
- Two-record research comparison with explicit uncertainty rather than automatic eligibility claims.
- Research-gap intelligence and privacy-safe geographic aggregation, not patient tracking.
- Reproducible research reporting with traceable references and appropriately governed exports.

### Delivery dependencies

Search and public evidence navigation can progress with GET-only access. ClinVar/CFTR2 federation requires source/licensing and external-API acceptance. Authenticated contribution and Helios write paths require verified Supabase RLS, audit and concurrent-claim controls. Clinical eligibility/interpretation and patient-context reporting require intended-use, professional review and privacy governance. The plan never equates a functional research interface with a clinically validated medical device.
