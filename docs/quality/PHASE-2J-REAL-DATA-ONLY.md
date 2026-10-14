# NeumuacFQ Phase 2J — No Synthetic Records in the UI

The owner has explicitly required the modern Vue interface to use real records rather than fabricated example variants. **This phase removes all synthetic records from the running Vue workspaces and uses only authorized Supabase reads or honest loading/unconfigured/error/empty states.**

## Engineering boundary

- Root production index.html/CNAME are unchanged; this phase does not cut over fq.neumact.org.
- Vue uses read-only GET requests against the existing `variants` schema for basic nomenclature fields. No clinical conclusion, evidence, validation or provenance is invented.
- No source URL or API key is hardcoded. The connection requires intentional configuration, using only a publishable/anonymous key and verified database policy. Public key alone is not authorization.
- No mutation endpoints, audit writers, clinical classifications or cached patient records exist in the new adapter.
- When disconnected or denied, the workspace must not substitute fixture rows.
- Full scientific search parity is still unverified, and full legacy search is **not** presented as implemented.

## Owner-dependent remaining gates

Before connecting to actual data, validate table exposure, RLS, permitted columns, IP/licensing concerns, public-vs-authenticated read policy and whether the intended users can see the requested records. A frontend key cannot replace RLS. Do not enable data access if records are sensitive and the public/anonymous role should be denied.

The isolated differential search corpus remains test-only and cannot populate the UI.
