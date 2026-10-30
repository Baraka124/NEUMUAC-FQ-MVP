# Phase 14H11 — Restore the five-regimen scientific domain

**Functional scope:** NFQ-014, NFQ-015, NFQ-025 and NFQ-026. This phase is a reusable data-domain implementation, not a clinician-visible eligibility calculator.

## Confirmed original contract

The frozen original `index.1.html` implements five distinct modulator regimens in its five-drug calculator: ETI (Kaftrio/Trikafta), Alyftrek, Kalydeco, tezacaftor/ivacaftor (Symkevi/Symdeko), and lumacaftor/ivacaftor (Orkambi). The live `drug_jurisdiction_rules` register contains four active EU records for ETI, Alyftrek, Kalydeco and Symkevi; Orkambi is missing from that table, although present in the original calculator. Do not infer regulatory approval from a static register.

The live `variants` table has two response fields, `eti_prediction` and `alyftrek_prediction`. The other three regimens have original genotype-calculator rules, **not** independent per-variant response classifications. Their response fields remain null in the unified projection.

## Delivered

- Canonical, immutable five-regimen catalog with regional name aliases.
- Read-only exact-variant adapter retrieving existing CFTR class, subtype, both response fields, both evidence-level/tier/source fields and validation count without mutating the DB.
- Strict input, schema, identity, access and bounded-response checking; no synthetic response values, class-to-drug inference, or patient genotype conclusions.
- Deterministic unit tests for identity/aliases, Class I subtype independence, single-row reads, malformed responses and authentication.
- Source metadata is kept literal; this phase does not claim source approval or recompute eligibility.

## Dependencies and next phases

14H12 freezes exceptional-Class-I regression cases and detects anomalous combinations for **review**, not automatic correction. 14H13 introduces the clinician-facing unified therapy section only after the domain tests pass. No writes, RLS changes, geographic events, or new backend deployments.
