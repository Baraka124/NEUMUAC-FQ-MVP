# Phase 14G7 — Where neumuacFQ stands

**Current milestone: backend integration (pre-deployment).** All source and database review workflow experiments still run in cost-free isolated CI. This is not an authorized clinical-scientific approval system, nor a live Railway service.

## Done
- 14G7A: environment-validated composition of Supabase Auth, restricted PostgreSQL session checks, and Node review routes; reviewer queue/submission/decision independent switches, all OFF by default
- 14G7B: Node HTTP tests of the complete compositional path, with **mock Supabase Auth** and synthetic bearer tokens; token subject, issuer and active-session checks executed before PostgreSQL adapter actions
- 14G7C: executable Node 22 startup source under `services/review-api/`, with pinned `postgres` dependency, restricted DB transport and forced loopback-only binding; intentionally rejects Railway's environment variables until real production release approval
- Existing 14G0/14G1 real Supabase production ACL and history-column lockdown remains in force; 14G2–14G6 private review logic and transactions passed disposable PostgreSQL test suites

## Hosting-ready vs live-ready
Future Node host: Railway **may be used later**, but this source is **not approved for public listening**. Do not set `RAILWAY_ENVIRONMENT` or disable this safeguard simply to make it connect. There is no CI/CD deployment to Railway or Supabase from these changes.

The production service needs a reviewed migration, signed-in scientific reviewer accounts, strict non-owner database transport role, safe secrets and network configuration, actual signed JWT acceptance, revocation tests against the real provider, audit observability, and independent governance authorization. The existence of candidate source code is not permission to run it against production.

## Environment controls
All server-only values must be configured privately at deploy time; never place these in `VITE_*` or a Vue bundle.

- `NFQ_REVIEW_SERVICE_ENABLED` — defaults OFF; any ON setting is rejected unless the scope is `isolated-testing`
- `NFQ_REVIEW_EXECUTION_SCOPE` — currently accepts `isolated-testing` only
- `NFQ_REVIEW_ALLOWED_ORIGIN` — must equal `https://fq.neumact.org`
- `NFQ_SUPABASE_AUTH_ORIGIN`, `NFQ_SUPABASE_AUTH_PUBLIC_KEY` — restricted Auth verification; public key not a role-grant
- `NFQ_REVIEW_TRANSPORT_DSN` — **server-only confidential connection string**, must name the dedicated `nfq_review_transport` role, never owner/service role
- `NFQ_REVIEW_QUEUE_ENABLED`, `NFQ_REVIEW_SUBMISSIONS_ENABLED`, `NFQ_REVIEW_DECISIONS_ENABLED` — independent OFF by default. There is no release endpoint.
- `PORT` — optional ephemeral port for isolated loopback tests. This implementation deliberately does not bind externally or accept Railway traffic.

Production clinical review activation requires a **new explicitly reviewed phase**, not just flipping environment variables. The backend service package exists to reduce future migration work, not to bypass that gate.

## Phase 14G8B — Explicit isolation of the live project

For `NFQ_REVIEW_EXECUTION_SCOPE=isolated-testing`, the config rejects the known active
CFTR Supabase project ref (`oxlkisjwfarseyqgeyuw`), regardless of valid-looking credentials.
It requires a dedicated `db.<same-test-project>.supabase.co` hostname, standard database
port and TLS `sslmode=require`. Pooler hostnames are deliberately not accepted in
this **test-only** scope because their project mapping cannot be verified from
the hostname alone. This is a defense-in-depth check, not certification that
a different Supabase project is genuinely non-production. Live review activation
still requires its own explicit security and scientific approval.
