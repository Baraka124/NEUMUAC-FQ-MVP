# Phase 14H4 — Original versus Vue response parity audit

## Scope

NFQ-015 / NFQ-026: compare distinct **recorded database fields** without promoting them to scientific facts. Variant-level `eti_prediction`, `therapy_responsive`, and `variant_evidence.eti_response` have different semantics and coverage. The cross-field audit signals continuity issues; it does not adjudicate drug efficacy, treatment eligibility, or patient response.

## Read-only source inventory, 29 October 2026

| Recorded source | Label / count |
|---|---|
| `variants` | 2,234 variant records |
| `eti_prediction` | 209 `responsive`, 1,106 `non_responsive`, 919 `unknown` |
| `therapy_responsive` | 19 `true`, 2,215 `false` |
| Variant label `responsive` with therapy flag `false` | **193** |
| Variant label `non_responsive` with therapy flag `true` | **3** |
| `variant_evidence` | 15 rows (14 have ETI response, 1 has null) |
| `evidence_sources` | 6 registered sources; **all** have null document URLs |

Representative original record IDs for read-only acceptance: #14 variant ETI `responsive`, therapy flag `false`, source ETI `non_responsive`; #7 both original and source labels `non_responsive`; #44 variant label `unknown` without source-linked rows. These IDs are original scientific **variant record identifiers**, not patient IDs. Current values must be rechecked in live acceptance because the underlying register may change.

## Delivered

- Strictly typed source-read adapter from 14H3, with original `variant_evidence` and source-metadata link integrity.
- Source-specific ETI and Alyftrek fields displayed separately in the variant dossier; no fabricated Alyftrek response.
- Deterministic parity screening for variant/legacy boolean disagreement, variant/source disagreement, source-to-source disagreement, missing source findings and unknown categories.
- UI reports field agreement only as **recorded-field continuity**, never scientific validation; unavailable evidence prevents the parity status from appearing as aligned.
- Unit regression matrix plus **opt-in live Playwright acceptance** for actual representative variant IDs. No automatic live external requests in CI.

## Remaining acceptance

- Run live browser acceptance after deployment with accessible read-only source views; verify original legacy UI labels side by side with the Vue UI and document differences.
- Review source attribution with a CFTR specialist. The `evidence_sources` table currently provides no direct document URLs; the `evidence_links` register is separate and cannot be automatically treated as a verified citation for these exact claims.
- No source-label consensus algorithm, automatic conversion from false flag to nonresponse, regulatory inference, patient-level prediction, or scientific completeness declaration.
- Historical functional-parity register remains **Partial / Not migrated** as previously tracked until clinician acceptance and independently verified provenance are completed.

No Supabase mutations, new grants or RLS changes, Railway deployment, Helios approval, paid staging, or geographic hit/miss events.
