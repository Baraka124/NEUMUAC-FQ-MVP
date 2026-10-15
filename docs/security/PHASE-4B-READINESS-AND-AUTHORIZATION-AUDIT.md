# Phase 4B — Production evidence readiness and authorization audit

**Review date:** 2026-10-15. **System:** connected Supabase project `Cystic Fibrosis`. Read-only SQL metadata and aggregate queries only; no database mutation. **NFQ-015 and NFQ-026 remain Not migrated.**

## Verified aggregate source inventory

| Query | Count |
|---|---:|
| Variant rows | 2,234 |
| Non-null ETI prediction fields | 2,234 |
| Non-empty ETI authority source | 14 |
| Non-null Alyftrek prediction fields | 2,234 |
| Non-empty Alyftrek authority source | 1,209 |
| Dedicated `variant_evidence` rows | 15 |
| Dedicated ETI response entries therein | 14 |
| Alyftrek response entries therein | 0 |
| `evidence_sources` rows | 6 |
| Drug jurisdiction rule rows | 4 |
| General `evidence_links` rows | 154 |

Counts are not independent clinical validations, response rates or treatment-eligible populations. In particular, a filled `eti_prediction` is not a source-verified finding. The legacy `variants.clinical_alert` generated field contains class/subtype-based treatment assertions. **Do not render that field as clinical advice or copy its logic into Vue.** Do not infer actual patient eligibility, safety or efficacy.

The existing `public.variant_evidence` and `public.evidence_sources` columns do not include the full document version, publication versus retrieval date, document location, methodology, territory and independent review state required by the Phase 4A contract. A generic source URL or reliability score does not solve this. The current typed readiness gate therefore rejects these tables as a directly displayable modulator evidence source. A separate provenance curation process is needed.

## Confirmed authorization exposure

Database `pg_policies` inspection confirms `variants_write` and `variants_update` authorize `anon` (and `authenticated`) with unrestricted `true` conditions. `evidence_links` has `anon_insert_evidence_links` with `WITH CHECK true`. `variant_evidence_write` applies to any signed-in identity with no curator-role predicate. Further broad write policies exist on `external_variant_data`, `helios_*`, `variant_notes`, `contradictions`, `research_gaps`, `validation_history`, `search_history_log`, and other tables. A separate `information_schema.role_table_grants` query confirms table-level write privileges on the core data and evidence tables. This requires urgent security review independently of the Vue read-only UI.

**Not performed:** an exploit/penetration test, patient data read, permission change, service key retrieval or production mutation.

## Mandatory remediation sequence — approval required

1. Inventory all consumer workflows and integrations that currently write these tables. Separate essential public search telemetry from any scientific or audit edits.
2. Back up, snapshot/restore-verify and establish a tested rollback path. Use a staging copy with no identifiable clinical data.
3. Design a deny-by-default write privilege matrix. Public `anon`: read only on expressly approved catalog views; no direct mutation of scientific, curation, audit or treatment-rule tables. Signed-in identity alone is insufficient for clinical/curator writes.
4. Replace unrestricted mutation policies with least-privilege, audited role or server-side verification policies. Evaluate column grants, functions, RPCs, storage, triggers and service-role bypass. Preserve the necessary trusted data-ingestion workflows.
5. Test HTTP/API permission denial for anonymous and ordinary signed-in users, approved write functions for authorized curators, SELECT access for public research, and legacy consumers that must be adapted.
6. Apply reviewed migrations to production only with explicit owner authorization and a recorded maintenance/recovery plan. Confirm deployed read/write behavior and monitor for regressions.

**No policy changes or migrations have been executed.** This document is for review, not executable production instructions.

## Criteria for Phase 4B evidence read adapter

- Scientific owner approval of versioned EMA/FDA/literature source records and their license/provenance.
- Verified source columns or a controlled, populated, audited evidence read-view, linked to exact variants and genotypes without guesswork.
- Document URL, version, published/retrieved dates, exact source location, method, territory and review attribution per record.
- The actual API grants and RLS checked through anonymous, reader and curator roles.
- No class-to-modulator mapping, no automatic indication or nonresponse judgment and no partial dataset passed off as complete.
- Negative controls: missing metadata, contradictory findings, stale documents, inaccessible authority links and 401/403 cases.
- Clinical and independent scientific signoff before enabling a public modulator evidence section.

**Outcome:** Phase 4B readiness/audit completed at metadata level; live source ingestion remains blocked and should not be reported as implemented.
