-- Phase 14H202 · Run ONLY against an isolated staging DB after applying the
-- proposed migration. Read-only introspection; transaction is rolled back.
begin;
do $test$
declare
 v_table text;
 v_rls boolean;
 v_rpc regprocedure;
begin
 foreach v_table in array array[
  'expert_reference_extractions','expert_reference_adjudications',
  'expert_reference_mappings','expert_reference_audit'
 ] loop
  if to_regclass('nfq_evidence_review.'||v_table) is null then
   raise exception 'Missing private expert registry table: %',v_table;end if;
  select c.relrowsecurity into v_rls from pg_class c
   where c.oid=to_regclass('nfq_evidence_review.'||v_table);
  if v_rls is distinct from true then
   raise exception 'RLS missing on %',v_table;end if;
  if has_table_privilege('anon','nfq_evidence_review.'||v_table,
      'SELECT,INSERT,UPDATE,DELETE') or
     has_table_privilege('authenticated','nfq_evidence_review.'||v_table,
      'SELECT,INSERT,UPDATE,DELETE') then
   raise exception 'Unrestricted REST table access found on %',v_table;end if;
 end loop;
 v_rpc:=to_regprocedure('public.nfq_expert_reference_registry(text,text,bigint,jsonb)');
 if v_rpc is null then raise exception 'Expert registry RPC missing';end if;
 if has_function_privilege('anon',v_rpc,'EXECUTE') then
  raise exception 'Anonymous can invoke private reviewer RPC';end if;
 if not has_function_privilege('authenticated',v_rpc,'EXECUTE') then
  raise exception 'Authenticated research RPC has no EXECUTE grant';end if;
 if not exists(select 1 from pg_proc p where p.oid=v_rpc
    and p.prosecdef and p.proconfig @> array['search_path=']::text[])
 then raise exception 'RPC must use reviewed security-definer and empty search path';end if;
 raise notice '14H202 private registry authorization and structural assertions passed';
end;
$test$;
rollback;
