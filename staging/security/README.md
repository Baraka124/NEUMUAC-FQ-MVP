# Phase 2K-S: security hardening prototype (not deployed)

This directory contains **nonautomatic SQL proposals** based on a read-only audit of the connected Cystic Fibrosis Supabase database. The files are deliberately **outside** `supabase/migrations`.

## Execution sequence (requires explicit deployment approval)

1. Confirm an owner-managed backup, and obtain a tested restore procedure.
2. Verify current policy signatures, database grants, legitimate client workflows, and credential/key rotation scope.
3. Reproduce the exact baseline inside disposable PostgreSQL and pass `030_security_contract.sql`.
4. Introduce replacement authenticated review, note and audit workflows. Legacy browser writes to clinical tables **will break** after `020`.
5. After an independent security and scientific owner review, deploy step `010` and step `020` in an authorized maintenance window with rollback rehearsal.
6. Verify actual Supabase Auth, REST, RLS and client behavior with separate anon/authenticated credentials, not simulated identities.

## Why staged

`010` targets particularly sensitive tables such as API keys, search logs (IP and clinician metadata), Helios audit and approval records, and public SECURITY DEFINER PIN functions. `020` intentionally preserves current read policies but disables unsafe anonymous and unrestricted authenticated writes pending a trusted backend.

Potential breaking changes include API key validation, PIN lock/unlock, Helios review, audit entries, notes, analytics logging, snapshot writes, variant imports and structured evidence edits. **No such workflow should be silently disabled in production.**

## Key risks still outstanding

- Database role/table grants without RLS do not prove access; test both.
- Public `variants` SELECT currently permits all columns, including possible clinician notes and provenance. A later view with an explicit safe column projection plus table-read revocation is necessary.
- Credentials potentially exposed under the current `api_keys` SELECT policy require an ownership and rotation review; do not retrieve key values.
- The same dataset contains a plaintext PIN entry and a hashed entry. Their values were not read. Consider invalidation/rotation after authenticated access migration, not before.
- Other tables were not remediated by these two files; perform a comprehensive permission inventory before claiming the project secure.
- SQL scripts are architectural proposals; the CI role simulator does not prove production Supabase JWT verification.
