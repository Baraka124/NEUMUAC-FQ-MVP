# neumuacFQ — Future Railway review API contract (no deployment)

The trusted backend is **not yet deployed**. The current public catalog and verified Auth remain Supabase-based, while the Helios review HTTP surface can later run on a separately operated **Railway Node service**. Railway is a hosting platform, not a new source of reviewer authority.

The transport-independent handler is `supabase/functions/_shared/reviewQueueGateway.mjs`; `services/review-api/httpServer.mjs` is a small Node 22+ HTTP adapter for the **read-only** queue. Its route is `GET /v1/helios/reviews?offset=0` (20/page). Its `GET /healthz` provides basic liveness only; it does not attest to Auth/database readiness.

**Browser contract:** `VITE_NFQ_HELIOS_QUEUE_ENABLED=true` plus explicit `VITE_NFQ_REVIEW_API_ORIGIN=https://<approved-domain>` routes only the Helios read-only queue to a future backend, keeping variant/evidence catalogue reads unchanged. That is a build-time origin, not a user-provided URL, and not an authorization control. Missing config means the existing Supabase Edge Function URL remains the fallback; the default feature remains disabled.

**Future trusted-server requirements:**

- Verify each submitted Bearer token with the project's authoritative Supabase Auth service (including issuer, subject and active session), not client-supplied `role`, `user_metadata` or email.
- Resolve current reviewer membership/specialist grants in the private PostgreSQL transaction using the existing `review_stage.review_queue` and `review_stage.review_command` contracts; do not expose those SQL functions to browser DB roles.
- Use a **dedicated NOINHERIT database transport login** with transaction-scoped `SET LOCAL ROLE nfq_review_executor`. Never embed owner, service-role, or DB credentials in the static Vue bundle.
- Keep strict CORS for `https://fq.neumact.org`, no-store responses, exact allowlisted route, and strict fixed-width JSON output. Protect the API with rate limits and operational monitoring when hosted.
- Retain `POST` review submission and approval **disabled** until independent scientific and security release authorization. This adapter intentionally exposes no mutating endpoint.
- The CI adapter verifies Web API behavior using stub principals. The separate disposable PostgreSQL CI verifies real row access, transaction scope, and audit. **Neither proves production JWT verification or a deployed Railway connection.**

Future Railway deployment should configure process-level environment variables and secrets privately. No Railway service/project is created and no cost incurred by this PR. References: https://docs.railway.com/variables and https://docs.railway.com/guides/public-networking.
