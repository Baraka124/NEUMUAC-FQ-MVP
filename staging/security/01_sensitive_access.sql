-- Phase 2K-S: STAGING PLAN, NOT AN AUTO-APPLIED MIGRATION.
-- STAGE A: emergency sensitive-data isolation. Requires explicit production approval.
-- Run first in a disposable/staging database with an exact production-schema snapshot.
begin;
revoke all on table public.api_keys from anon, authenticated;
revoke all on table public.app_config from anon, authenticated;
revoke all on table public.api_usage_logs from anon, authenticated;
revoke all on table public.search_logs from anon, authenticated;
revoke all on table public.search_history_log from anon, authenticated;
revoke all on table public.audit_log from anon, authenticated;
revoke all on table public.helios_audit_log from anon, authenticated;
revoke all on table public.validation_history from anon, authenticated;
revoke all on table public.variant_notes from anon, authenticated;
revoke all on table public.genotype_assessments from anon, authenticated;
revoke all on table public.helios_pending_review from anon, authenticated;
revoke all on table public.helios_feedback from anon, authenticated;
revoke all on table public.search_miss_queue from anon, authenticated;
revoke execute on function public.check_write_pin(text) from public, anon, authenticated;
revoke execute on function public.set_write_pin(text) from public, anon, authenticated;
-- Remove permissive policies even if a future grant accidentally re-exposes tables.
drop policy if exists anon_read_api_keys on public.api_keys;
drop policy if exists anon_read_app_config on public.app_config;
drop policy if exists anon_read_search_logs on public.search_logs;
drop policy if exists anon_all_search_history_log on public.search_history_log;
drop policy if exists anon_read_audit_log on public.audit_log;
drop policy if exists anon_read_helios_audit on public.helios_audit_log;
drop policy if exists anon_select_validation_history on public.validation_history;
drop policy if exists anon_all_variant_notes on public.variant_notes;
drop policy if exists anon_select_helios_pending on public.helios_pending_review;
drop policy if exists anon_all_helios_feedback on public.helios_feedback;
drop policy if exists anon_select_miss_queue on public.search_miss_queue;
commit;
