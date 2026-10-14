# Phase 2L-C — complete source-level inventory: work in progress

An executable static scanner is introduced in `tools/legacy_endpoint_inventory.py` and runs in the Phase 2L-C workflow against the full root `index.html`. It emits a downloadable, **redacted candidate inventory** with line numbers. It does not read the database or execute SQL.

**Critical qualification:** candidates are not a verified or exhaustive access map. Source aliases, wrapper calls, dynamic URLs, multiline expressions, code-generated endpoints and secondary modules require human review. The 2.4 MB file could not be returned through the GitHub connector in this session, so no manual claims about exact call-site locations are made.

## Review workflow
1. Verify scanner CI; download redacted artifact and inspect all line references.
2. Resolve every dynamic target and `fetch` to a table/view/function and method using the source code in a secure local checkout.
3. Audit direct JS calls, wrapper services, dynamic and multiline operations; distinguish reads, inserts, updates, deletes and RPCs.
4. Map each call to the legacy UI journey and to 010, 020, 040, 050 prospective effects. Add acceptance tests for preserved behavior.
5. Confirm actual grants, RLS policies and view/RPC owners in authorized isolated Supabase staging, with signed JWT sessions.
6. Keep unresolved endpoints explicitly blocked from production migration.

## Design carry-forward
Future Vue integration MUST satisfy `docs/quality/RESEARCH-INTERFACE-CONTRACT.md`, especially disciplined hierarchy, purposeful controls, evidence provenance, responsive stability, and real-data-only clinical screens.

No production deployment, Supabase mutation, legacy index rewrite or synthetic clinical UI data is included in Phase 2L-C.
