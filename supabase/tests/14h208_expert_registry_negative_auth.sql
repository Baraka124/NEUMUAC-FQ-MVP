-- 14H208 · STAGING-ONLY negative authorization matrix.
-- Run after applying the proposed 14H200 migration to an isolated staging DB.
-- This test MUST NOT be executed against the active CFTR production project.
-- This outer transaction is rolled back even if assertions pass.
begin;
do $preflight$
declare
 v_executable boolean;
 v_secdef boolean;
 v_path text[];
 v_case text:='g551d-ivacaftor-2011';
 v_oid regprocedure:=to_regprocedure('public.nfq_expert_reference_registry(text,text,bigint,jsonb)');
begin
 if v_oid is null then raise exception 'Missing versioned expert reference RPC';end if;
 select p.prosecdef,p.proconfig into v_secdef,v_path
 from pg_proc p where p.oid=v_oid;
 if v_secdef is distinct from true or not ('search_path='=any(v_path))
  then raise exception 'Registry RPC security context is not pinned';end if;
 if has_function_privilege('anon',v_oid,'EXECUTE')
  then raise exception 'Anonymous role unexpectedly has RPC execute access';end if;
 if not has_function_privilege('authenticated',v_oid,'EXECUTE')
  then raise exception 'Authenticated role has no registry RPC execute access';end if;
 foreach v_case in array array[
  'expert_reference_extractions','expert_reference_adjudications',
  'expert_reference_mappings','expert_reference_audit'
 ] loop
  if to_regclass('nfq_evidence_review.'||v_case) is null then
   raise exception 'Missing registry storage table %',v_case;end if;
  if not (select relrowsecurity from pg_class
          where oid=to_regclass('nfq_evidence_review.'||v_case)) then
   raise exception 'Storage table % lacks RLS',v_case;end if;
  if has_table_privilege('authenticated','nfq_evidence_review.'||v_case,'INSERT') or
     has_table_privilege('authenticated','nfq_evidence_review.'||v_case,'UPDATE') or
     has_table_privilege('authenticated','nfq_evidence_review.'||v_case,'DELETE') or
     has_table_privilege('authenticated','nfq_evidence_review.'||v_case,'SELECT')
   then raise exception 'Direct authenticated data access exposed on %',v_case;end if;
 end loop;
end;
$preflight$;
-- Temporarily impersonate the anonymous SQL role; this cannot grant a JWT.
savepoint before_anon;
set local role anon;
do $negative_anon$
declare accepted boolean:=false;
begin
 begin
  perform public.nfq_expert_reference_registry('list','g551d-ivacaftor-2011',1,null);
  accepted:=true;
 exception when insufficient_privilege then null;
 end;
 if accepted then raise exception 'Anonymous research registry request unexpectedly succeeded';end if;
end;
$negative_anon$;
rollback to savepoint before_anon;
-- A PostgREST SQL role alone must not authorize access in the absence of
-- an active verified JWT/session; this verifies the fail-closed predicate.
savepoint before_auth;
set local role authenticated;
select set_config('request.jwt.claims','{}',true);
do $negative_authenticated$
declare accepted boolean:=false;
begin
 begin
  perform public.nfq_expert_reference_registry('list','g551d-ivacaftor-2011',1,null);
  accepted:=true;
 exception when insufficient_privilege then null;
 end;
 if accepted then raise exception 'Unauthenticated JWT reached expert records';end if;
end;
$negative_authenticated$;
rollback to savepoint before_auth;
rollback;
