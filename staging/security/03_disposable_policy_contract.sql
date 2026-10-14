\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 only, never Supabase production.
create role anon nologin;
create role authenticated nologin;
create schema if not exists public;
create table public.variants(id bigint primary key, legacy_name text);
create table public.evidence_links(id bigint primary key);
create table public.variant_evidence(id bigint primary key);
create table public.evidence_sources(id bigint primary key);
create table public.api_keys(id bigint primary key, key text);
create table public.app_config(key text primary key,value text);
create table public.api_usage_logs(id bigint primary key);
create table public.search_logs(id bigint primary key);
create table public.search_history_log(id bigint primary key);
create table public.audit_log(id bigint primary key);
create table public.helios_audit_log(id bigint primary key);
create table public.validation_history(id bigint primary key);
create table public.variant_notes(id bigint primary key);
create table public.genotype_assessments(id bigint primary key);
create table public.helios_pending_review(id bigint primary key);
create table public.helios_feedback(id bigint primary key);
create table public.search_miss_queue(id bigint primary key);
grant usage on schema public to anon,authenticated;
grant all on all tables in schema public to anon,authenticated;
alter table public.variants enable row level security;
alter table public.evidence_links enable row level security;
alter table public.variant_evidence enable row level security;
alter table public.evidence_sources enable row level security;
alter table public.api_keys enable row level security;
alter table public.app_config enable row level security;
alter table public.search_logs enable row level security;
alter table public.helios_pending_review enable row level security;
create policy variants_read on public.variants for select to anon,authenticated using(true);
create policy variants_update on public.variants for update to anon,authenticated using(true) with check(true);
create policy variants_write on public.variants for insert to anon,authenticated with check(true);
create policy anon_select_evidence_links on public.evidence_links for select to anon using(true);
create policy anon_insert_evidence_links on public.evidence_links for insert to anon with check(true);
create policy variant_evidence_read on public.variant_evidence for select to anon,authenticated using(true);
create policy "Public read access for evidence_sources" on public.evidence_sources for select to public using(true);
create policy anon_read_api_keys on public.api_keys for select to anon,authenticated using(true);
create policy anon_read_app_config on public.app_config for select to anon using(true);
create policy anon_read_search_logs on public.search_logs for select to anon,authenticated using(true);
create policy anon_select_helios_pending on public.helios_pending_review for select to anon using(true);
create function public.check_write_pin(p_pin text) returns boolean language sql security definer as $$select false$$;
create function public.set_write_pin(p_pin text) returns void language sql security definer as $$select$$;
grant execute on function public.check_write_pin(text), public.set_write_pin(text) to anon,authenticated;
\i staging/security/01_sensitive_access.sql
do $$begin
 if has_table_privilege('anon','public.api_keys','select') then raise exception 'ANON CAN READ CREDENTIAL TABLE'; end if;
 if has_table_privilege('anon','public.search_logs','select') then raise exception 'ANON CAN READ SEARCH LOGS'; end if;
 if has_table_privilege('anon','public.helios_pending_review','select') then raise exception 'ANON CAN READ HELIOS REVIEW'; end if;
 if has_function_privilege('anon','public.set_write_pin(text)','EXECUTE') then raise exception 'PIN RPC STILL PUBLIC'; end if;
 if not has_table_privilege('anon','public.variants','select') then raise exception 'PUBLIC VARIANT READ BROKEN'; end if;
 if not exists(select 1 from pg_policies where tablename='variants' and policyname='variants_read') then raise exception 'VARIANTS READ POLICY REMOVED'; end if;
end$$;
\i staging/security/02_anon_write_cutover.sql
do $$begin
 if has_table_privilege('anon','public.variants','update') then raise exception 'ANON VARIANT UPDATE PERMITTED'; end if;
 if has_table_privilege('anon','public.variants','insert') then raise exception 'ANON VARIANT INSERT PERMITTED'; end if;
 if exists(select 1 from pg_policies where tablename='variants' and policyname in ('variants_write','variants_update')) then raise exception 'VARIANT WRITE POLICY PERSISTS'; end if;
 if has_table_privilege('anon','public.evidence_links','insert') then raise exception 'ANON EVIDENCE INSERT PERMITTED'; end if;
 if not has_table_privilege('anon','public.variants','select') then raise exception 'PUBLIC VARIANT DISCOVERY BROKEN'; end if;
 if not has_table_privilege('anon','public.evidence_links','select') then raise exception 'PUBLIC EVIDENCE DISCOVERY BROKEN'; end if;
end$$;
select 'PHASE 2KS STAGING SQL CONTRACT PASSED' as outcome;
