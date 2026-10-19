# Phase 14G4 — Helios reviewer queue integration

**Scope:** read-only, source-backed review workflow metadata; no Helios scientific decision or claim activation.

- `staging/review/001_review_schema_and_rpc.sql`: private reviewer queue `review_stage.review_queue`. Requires a non-revoked reviewer/administrator research membership and an enabled specialist grant. Returns up to 20 typed decision metadata records per page. The query excludes evidence payloads, reviewer identity, proposer identity, private notes and unverified clinical claims.
- `supabase/functions/nfq-review-queue/index.ts`: server Auth verification and current-session check, transaction-scoped dedicated review role, read-only queue, default `NFQ_REVIEW_QUEUE_ENABLED` **off**. No production deployment or roles/secrets provisioned.
- `apps/clinical-web/src/services/heliosQueue.ts`: browser GET-only adapter with explicit opt-in `VITE_NFQ_HELIOS_QUEUE_ENABLED=true`, signed-in session bearer and verified server response decoding. Public baseline remains unconnected.
- `apps/clinical-web/src/views/Helios.vue`: queue pagination and truthful loading/denied/empty/unavailable states. A queue record only shows *decision metadata*, not scientific sources or values. The evidence assessment and all claim/approval controls remain unavailable.

## Staging gates required before opt-in

1. Provision an isolated Supabase staging project/branch. The connected account currently exposes **no staging branches** for the Cystic Fibrosis project. Never use the unrelated inactive project as a clone or deploy review schema to production to speed development.
2. Run verified SQL schema + narrow transport role provisioning, reviewed `auth.sessions` permissions, and real signed JWT/public HTTP negative tests in staging. Confirm revocation and cross-account denial.
3. Verify real staff memberships and specialist grants using server-owned records; do not treat neumDESK roles or client JWT metadata as trusted review authority.
4. Confirm queue never returns raw reviewer identity, evidence summaries or legacy Helios rows. Audit pagination, concurrent membership revocations, request errors and cancellation across refresh/sign-out.
5. Only then opt in the **read-only** queue client for controlled beta. Keep `NFQ_REVIEW_GATEWAY_ENABLED` disabled, `allowRelease:false`, and all reviewer mutations disabled pending separate clinical-scientific release acceptance.

**No synthetic scientific records are written or shown by these phases.** Isolated unit/SQL tests use synthetic identifiers solely to exercise code contracts. Public website retains its existing read-only state until staging acceptance.
