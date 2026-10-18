# Phase 4F-12G — Deny-by-default Helios read connector

The `loadHeliosReviewList` port is intentionally disconnected unless a reviewed server-authorized adapter is supplied. Missing connection => `not-connected`; malformed/failed responses => `access-denied`; authorized empty results => `empty`. A narrow published-review decoder strips unexpected fields. **Client-side filtering does not secure the network response.**

Before supplying a real port: remediate exposed Helios RLS/grants; verify authenticated backend identity and least-privilege projection; enforce server-side access denials and exclude sensitive fields before transmission; verify no PHI; test stale tokens, pagination, errors, malformed records and duplicate IDs. No direct fetch from the publicly accessible legacy Helios table. No live endpoint or production data changes in this phase.
