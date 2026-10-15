# Geographic Intelligence: live privacy gate (2026-10-15)

The Spanish boundary map is designed to render publicly, without login, at `/#/geography`. It contains **only cartographic shapes** until a reviewed aggregate endpoint exists.

## Applied to Supabase production

Migration recorded by Supabase as `restrict_public_raw_geographic_analytics_20261015` succeeded.

- Revoked SELECT privileges for `anon` and `authenticated` on `search_logs`, `search_history_log`, `search_miss_queue`, `api_usage_logs`, `geo_search_enriched`, `search_analytics_summary`, `search_analytics_weekly`, `search_coverage_stats`, and `hospital_search_stats`.
- Dropped `anon_read_search_logs`, `anon_all_search_history_log`, `anon_select_miss_queue`, and `anon_update_miss_queue` policies.
- Revoked UPDATE and DELETE on `search_logs`, `search_history_log`, and `search_miss_queue` for public and ordinarily authenticated roles.
- Checked `has_table_privilege`: both roles no longer have SELECT on the listed analytics tables/views.
- **Existing `variants` public SELECT stayed intact.** No search events were deleted or modified.

## Outstanding security work

This is **not a complete security audit**. `anon` still has raw INSERT privileges on certain legacy telemetry tables, and other unrelated scientific tables have separately identified broad grants. No comprehensive permission matrix or verified source collection pipeline has been deployed. The existing public RLS policies, service-role behavior, security-definer functions, view dependencies, back-office integrations, rate limits, retention and lawful basis remain to be verified. Do not connect geographic aggregate values directly to raw views.

A later migration must replace permissive anonymous event insertion with a validated server collector, audit legacy consumers, and enforce privacy-safe aggregation with suppression and anti-differencing. Until then, the map has no live geographic statistics.

## Public acceptance

- Public route and landing entry are accessible without an administrator password.
- No client fetch to `search_logs`, `geo_search_enriched`, IP/GPS or any other raw personal event store.
- Map and region selection remain usable with no stats.
- Tests at 320, 390, 768, 1024 and 1366 pixels must pass before merge.
