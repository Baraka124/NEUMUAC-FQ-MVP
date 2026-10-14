-- Phase 2K-S: STAGE B; apply only after frontend authenticated writes are deployed.
-- Preserves existing public, read-only variant and evidence discovery.
begin;
revoke insert,update,delete on public.variants from anon;
revoke insert,update,delete on public.evidence_links from anon;
revoke insert,update,delete on public.variant_evidence from anon;
revoke insert,update,delete on public.helios_pending_review from anon;
revoke insert,update,delete on public.search_miss_queue from anon;
revoke insert,update,delete on public.audit_log from anon;
revoke insert,update,delete on public.validation_history from anon;
drop policy if exists variants_update on public.variants;
drop policy if exists variants_write on public.variants;
-- The authenticated replacement is intentionally NOT added here. Existing
-- authenticated permissive writes must be moved to narrowly scoped RPCs,
-- not merely renamed with auth.uid() IS NOT NULL.
drop policy if exists anon_insert_evidence_links on public.evidence_links;
drop policy if exists anon_insert_helios_pending on public.helios_pending_review;
drop policy if exists anon_update_helios_pending on public.helios_pending_review;
drop policy if exists anon_insert_miss_queue on public.search_miss_queue;
drop policy if exists anon_update_miss_queue on public.search_miss_queue;
drop policy if exists anon_insert_audit_log on public.audit_log;
drop policy if exists anon_insert_validation_history on public.validation_history;
-- Deliberate permitted public reads:
-- variants_read, anon_select_evidence_links, variant_evidence_read,
-- and Public read access for evidence_sources are retained.
commit;
