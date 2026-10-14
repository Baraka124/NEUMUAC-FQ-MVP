# Phase 2L-B — Legacy access map and migration dependency register

**Review status:** preliminary source-based map, not a completed live-endpoint trace. No production changes authorized.  
**Baseline:** Phase 2K-S security audit, staging SQL 010–060, legacy production root `index.html`, separate Vue clinical-web.

| Journey / component | Known legacy data surfaces | Risk on hardening | Required replacement and verification |
|---|---|---|---|
| Variant lookup and variant detail | `public.variants`, proposed `nfq_public_variant_catalog` | 040 base-table SELECT revoke breaks direct legacy reads | Explicit field allowlist; compare real search outputs and eligibility with frozen differential tests |
| Clinical variant editing / imports | `public.variants`; existing anonymous mutation paths identified in 2K-S audit | 020 / 02 blocks direct browser writes | Narrow authenticated mutation RPC, audit, conflict/version enforcement and real permissions |
| Evidence search / editing | Evidence and structured evidence tables (exact endpoint inventory pending) | Anonymous write revocation may break evidence curation | Read-only public projection; separately authorized curator transactions |
| Notes | `variant_notes`; proposed authenticated note operation | 010 removes browser reads/writes | Server-attested identity, scoped note visibility, append-only audit |
| Helios proposals and reviews | `helios_pending_review`, `helios_audit_log`, `helios_feedback` | 010 disables legacy client operations | Separation of proposer/reviewer/release roles, reviewed transition RPC, immutable history |
| Search analytics | `search_logs`, `search_miss_queue`, `search_history_log`, `api_usage_logs` | 010 breaks current logging | Consent/retention review, restricted server ingestion, redact IP/user metadata |
| Audit and validation history | `audit_log`, `validation_history` | 010 blocks existing browser append/read | Trusted append-only service; least-privilege audit reader |
| PIN / settings | `app_config`, `api_keys`, `check_write_pin(text)`, `set_write_pin(text)` | 010 disables PIN and settings flows | Replace with Supabase Auth and trusted admin capabilities; credential rotation by owner |

## Still unverified (must not be described as complete)
1. All exact REST paths and JavaScript call sites in the 2.4 MB root `index.html`, including dynamically constructed calls.
2. All real schema objects, role inheritance, table/column grants, view owners, policies, function overloads and default EXECUTE grants.
3. Policy implications of both sets `010/020` and `01/02`; migrations are alternative proposals until reconciled.
4. Role and session behavior under real signed JWTs, including token revocation and expiration.
5. Clinical completeness and non-regression for legitimate imports, evidence edits, audit, analytics, PIN and Helios.
6. Recovery, backup, key rotation and independent owner approval.

## Phase 2L-B acceptance gate
- Complete the endpoint-to-data-surface matrix with file/line references and actual read/write semantics before any privileged deployment.
- Add deny/allow tests against real isolated Supabase using only authorized test data; mocks alone do not count.
- Preserve the old root application; never silently disable valid operational journeys.
- Mark each journey **mapped / replacement implemented / isolated verification passed / production approved** independently.
- No exposed secrets, clinician identifiers, IPs, private notes or patient data in GitHub artifacts.

## UI relationship
Security is an invisible infrastructure boundary. It must not surface as miscellaneous buttons, permissions cards or developer diagnostics in the normal research interface. The product's visual and interaction contract is defined in `docs/quality/RESEARCH-INTERFACE-CONTRACT.md`.
