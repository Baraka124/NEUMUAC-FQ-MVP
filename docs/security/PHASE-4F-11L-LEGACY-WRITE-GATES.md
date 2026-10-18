# Phase 4F-11L — Original Helios write paths and security cutover gates

Read-only source review on 2026-10-18. No SQL or production changes.

## Legacy source findings: frozen index.1.html

- Around L10709, a Helios audit POST uses the configured browser API key as its bearer token, rather than a verified clinician session.

- L30805–30821: inbox reads can trigger PATCH updates re-opening expired deferred reviews.

- L30835–30865: loading the inbox can asynchronously PATCH items as superseded using browser-held state.

- L31665–31700: a local PIN/write-mode UX guard precedes a PATCH to defer; audit is issued in a separate request.

- L31950–31982: note edits PATCH a discussion JSON value, followed by a separate audit POST.

- L31975–32000: routine bulk approval can apply changes to variant records.

Browser PIN/write-mode checks are not server authorization. The inspected live database granted anon INSERT on variants, Helios inbox, audit and validation history; and UPDATE on variants and Helios inbox through permissive policies.

## Required isolated-database acceptance matrix

1. Anonymous reader: only permitted public GET research fields; reject writes to variant, Helios and audit tables.

2. Authenticated without reviewer permission: reject all review decisions and direct canonical variant edits.

3. Submitter: proposed alias with source and accountable authenticated actor; no self-approval.

4. Reviewer: permitted claim and recorded decision only with rationale, valid transition, owner authorization and independent actor.

5. Concurrent reviewers: one winner for claim/decision, one conflict, one immutable audit entry.

6. Expired/revoked session, impersonated reviewer, forged submitter/actor: denied server-side.

7. Audit: no direct UPDATE, DELETE or TRUNCATE; server-controlled actor identity and atomic decision/event recording.

8. Replace legacy auto-resurfacing, auto-supersede, defer, notes and bulk approval with authorized audited equivalents.

9. Verify read-only exact matching, multi-term discovery and evidence navigation remain intact.

## Owner approval gates

Confirm deployed Supabase project, inventoried integrations, grants, policies and functions; create backup, test forward/rollback in isolated environment, obtain platform owner and clinical governance approval before hardening live permissions or enabling synonym persistence.

Phase status: security design and historical dependency mapping only; NOT a deployed fix.