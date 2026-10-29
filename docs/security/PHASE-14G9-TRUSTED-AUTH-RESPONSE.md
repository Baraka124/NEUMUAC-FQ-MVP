# Phase 14G9A — Bounded Auth profile response

The review transport verifies the supplied bearer token with the trusted Supabase `/auth/v1/user` endpoint; neither the Vue UI nor JWT decoding alone grants reviewer authority.

## Implemented

- Keep Phase 14G8's HTTPS Auth origin validation, token syntax/size guard, and bounded transport request.
- For **HTTP 200** Auth replies, reject declared response lengths exceeding 64 KiB, then independently bound the streamed body to 64 KiB before parsing.
- Reject malformed UTF-8, malformed JSON, missing body or unexpected stream chunks without exposing raw response content or user metadata.
- Retain the existing identity, issuer, expiry, authenticated role, confirmed-email, and active private database session checks.
- Negative tests cover oversized declared length, streamed oversize with cancellation, malformed body, and valid matching identity.

This is a defensive transport limit, not an assertion that scientific reviewers have been provisioned. No paid staging, hosted database, Supabase permission changes, Railway release, Helios writing, or geographic event tracking are enabled. Disposable local PostgreSQL and CI remain the verification route.

## Separate outstanding clinical parity

NFQ-015 and NFQ-026 remain unfinished: the Vue v2 modulator-response model is structurally defined, but no verified live responder/non-responder data source is connected. A functional class, evidence-link title, or regulatory label cannot be silently converted into a response finding. The prior view's exact data fields, scientific provenance, and permitted publication scope must be reconciled before showing this as a result.
