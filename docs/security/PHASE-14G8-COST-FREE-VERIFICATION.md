# Phase 14G8 — Cost-free trusted backend hardening

- **14G8A:** Signed JWT fixture whose cryptographic integrity is verified by a **local test-only Auth double**. It exercises the real Node HTTP composition and private-transaction entrypoint with tampered/expired/foreign tokens, but is NOT a real signed Supabase JWT acceptance test.
- **14G8B:** Isolated review configuration explicitly rejects the known production Cystic Fibrosis Supabase project, rejects cross-project or project-ambiguous PostgreSQL connections, and requires standard TLS. This makes a mistaken test-to-production connection harder but does not prove a different endpoint is nonproduction.
- **14G8C:** Real Supabase Auth verification requests are bounded to five seconds by default (configurable 10–10000 ms for testing) using AbortSignal.timeout, and oversized/malformed bearer credentials are denied before a provider request. A provider timeout fails closed as an unavailable identity service, not as authorized reviewer access.

**Release boundary:** No Railway deployment, paid staging, production RLS alteration, live scientific submission or Helios approval was authorized. Existing write switches remain disabled, and the isolated server refuses Railway environments. Additional tests with real Supabase signed-in staff and an independently provisioned private role are still required before any production beta activation.

The source of reviewer authority remains the server-verified JWT, active session, research membership, specialist grant and atomic review transaction. Client claims, local JWT decoding alone, and a green CI badge cannot replace those checks.
