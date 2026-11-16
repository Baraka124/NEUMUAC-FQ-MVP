# 14H162 · Protected historical geographic research search activity

## Source verification — correct CFTR Supabase project

Read-only inspection of the *Cystic Fibrosis* project (not neumDESK/RADAR) found:
- `public.search_logs`: 1,031 historical entries, 818 with country+region, with source values `ipapi.co`, `browser_gps` or missing.
- `public.search_history_log`: 287 rows with institution and variant IDs but without reliable distinct-session denominators.
- Search log data mostly dates from April–June 2026. These historical records may include tests and do NOT demonstrate patient locations or CFTR allele frequencies.
- The strict requested activity query (`country=Spain`, `ip_source=ipapi.co`, `is_hit=true`, `matched_variant_id is not null`, >=20 logged hits AND >=10 distinct sessions **per displayed region**), matched two coarse regional groups during inspection: Galicia **674** recorded events / **83** sessions, Madrid **111** events / **22** sessions. These are database observations, not hardcoded UI values. Future values always come from the server function.
- Other small/empty/incomplete groups, exact GPS, institution names, coordinates, search text, IP addresses and session identifiers are never returned.

## Database access control

SQL under `docs/sql/14H162_authorized_geographic_research_activity.sql`
defines `public.nfq_geographic_research_activity(p_variant_id bigint DEFAULT NULL)`.

It is a read-only, fixed-purpose aggregation RPC with these defenses:
1. `SECURITY DEFINER` with an empty search path and **no dynamic SQL**.
2. Execution revoked from `PUBLIC`, `anon` and `service_role`, granted only to `authenticated`.
3. **Inside the function** both an actual authenticated JWT identity and an active, unrevoked `nfq_research_memberships` record of role `administrator`, `reviewer` or `contributor` are mandatory. Signup alone is insufficient. An anonymous sign-in JWT is explicitly excluded.
4. A variant ID, if supplied, is checked and inserted as a typed bound parameter. No date-range, institutional, geographic or text query filter can be supplied to reconstruct individual records through differencing.
5. All output cells must independently meet 20 events and 10 distinct nonempty sessions. Only canonical Spain region codes, event/session counts and overall first/last timestamps leave the function. It cannot expose identities, GPS, source IP, institution, patient or query text.
6. Only `ipapi.co` coarse IP region attribution is included. `browser_gps` and institution-history rows are excluded. The output is **historical research search activity**, not patient prevalence, treatment response, hospital demand or clinically verified variant geography.
7. The Vue client requires verified researcher state to request the RPC, authenticates with the actual session bearer token, and validates all rows again. The server membership/RPC is the actual authority—not the client state.

**Important source security observation:** legacy `institutions` policies include permissive names for anonymous writes; actual SQL grants inspected currently allow `anon` SELECT but not UPDATE. This RPC never touches that table. Existing policies and grants are not changed in this phase; they require a separate audit.

## Connected interface

The existing **Spain map** remains; only verified research users can see light-blue activity regions and a small date/volume/session readout in the existing right-hand regional detail. The same map and 19 regions, keyboard support and Daylight/Midnight hierarchy remain. On linked variant navigation, the server applies the same minimum thresholds to **that variant** and displays a quiet `No publishable aggregate` when none qualifies, not a fake zero or inferred carrier location. Signed-out/guest/unverified accounts see the public boundary map and a sign-in/access note, never source counts.

The user-provided original `index (86).html` remains untouched. The original's raw institutional-location and search-history logic is **not** copied into the client.

## Verification / rollout

- Test safe decode, RPC path, JWT transport, no direct raw-log REST SELECT, threshold enforcement, unauthenticated and malformed states, 320/390/1366px and both themes, old scientific workflows and complete browser suites.
- Apply the documented SQL through the CFTR project's tracked Supabase migration tool only after PR review. Test anonymous inability, unassigned denial and a verified member's eligible totals without exposing rows. Run Supabase security advisors afterward.
- The release must keep `NFQ-030` **Partial** at most until data provenance, RLS and live-domain scientific acceptance; population allele frequency and geographic search activity remain separate.
