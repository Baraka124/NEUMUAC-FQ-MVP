-- Disposable PostgreSQL CI only. NEVER RUN AGAINST A SUPABASE PROJECT.
\set ON_ERROR_STOP on
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
\i staging/review/001_review_schema_and_rpc.sql
create extension if not exists pgcrypto;

insert into review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
values ('NFQ-NOM-101',1,'alias-equivalence','00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64));
insert into review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
values ('NFQ-NOM-101',1,repeat('a',64),'00000000-0000-0000-0000-000000000009');
insert into review_stage.actor_grants(actor_id,role_name,granted_by) values
('00000000-0000-0000-0000-000000000002','scientific','00000000-0000-0000-0000-000000000009'),
('00000000-0000-0000-0000-000000000003','engineering','00000000-0000-0000-0000-000000000009'),
('00000000-0000-0000-0000-000000000004','release-manager','00000000-0000-0000-0000-000000000009');

-- Reject unauthenticated / direct table writes, with no owner privilege.
set role authenticated;
do $$begin
  begin
    insert into review_stage.events(decision_id,revision,request_key,actor_id,action,previous_phase,next_phase,previous_version,next_version,reason)
    values ('NFQ-NOM-101',1,'unauthorized12','00000000-0000-0000-0000-000000000001','submitted','draft','under-review',0,1,'attempt');
    raise exception 'DIRECT WRITE WAS PERMITTED';
  exception when insufficient_privilege then null; end;
end$$;
reset role;

-- Simulated authenticated JWT claims: ONLY valid as local CI mechanics;
-- these GUCs are NOT trustworthy when set by a real browser.
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.nfq_stage_review_command('NFQ-NOM-101',1,0,'submit',null,null,'submit-example-01','Submit fixture') as submit_result;
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
select public.nfq_stage_review_command('NFQ-NOM-101',1,1,'review','approve','scientific','approve-examp-01','Scientific fixture review') as scientific_result;
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
select public.nfq_stage_review_command('NFQ-NOM-101',1,2,'review','approve','engineering','approve-examp-02','Engineering fixture review') as engineering_result;
reset role;

insert into review_stage.release_authorizations(decision_id,revision,ruleset_hash,approved_by,purpose)
values ('NFQ-NOM-101',1,repeat('b',64),'00000000-0000-0000-0000-000000000009','Independent fixture authorization');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
select public.nfq_stage_review_command('NFQ-NOM-101',1,3,'release',null,null,'release-example01','Staging-only release') as release_result;
select public.nfq_stage_review_command('NFQ-NOM-101',1,3,'release',null,null,'release-example01','Staging-only release') as replay_result;
reset role;

do $$begin
 if (select phase from review_stage.decisions where id='NFQ-NOM-101') <> 'released' then raise exception 'STATE DID NOT RELEASE'; end if;
 if (select row_version from review_stage.decisions where id='NFQ-NOM-101') <> 4 then raise exception 'WRONG ROW VERSION'; end if;
 if (select count(*) from review_stage.events where decision_id='NFQ-NOM-101') <> 4 then raise exception 'DUPLICATE AUDIT EVENTS'; end if;
 if (select count(*) from review_stage.idempotency where decision_id='NFQ-NOM-101') <> 4 then raise exception 'WRONG IDEMPOTENCY COUNT'; end if;
end$$;

-- Atomic rollback through intentional audit-trigger failure: no state change.
insert into review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
values ('NFQ-GATE-102',1,'search-disposition','00000000-0000-0000-0000-000000000001',repeat('c',64),repeat('d',64));
insert into review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
values ('NFQ-GATE-102',1,repeat('c',64),'00000000-0000-0000-0000-000000000009');

create function review_stage.force_audit_failure() returns trigger language plpgsql as $$begin
 if new.decision_id='NFQ-GATE-102' then raise exception 'forced_audit_failure'; end if;
 return new;
end$$;
create trigger test_fail_event before insert on review_stage.events
 for each row execute function review_stage.force_audit_failure();
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $$begin
 begin
 perform public.nfq_stage_review_command('NFQ-GATE-102',1,0,'submit',null,null,'submit-fail-001','Atomicity test');
 raise exception 'EXPECTED AUDIT FAILURE DID NOT OCCUR';
 exception when others then
  if sqlerrm <> 'forced_audit_failure' then raise; end if;
 end;
end$$;
reset role;
do $$begin
 if (select phase from review_stage.decisions where id='NFQ-GATE-102') <> 'draft' then raise exception 'PARTIAL TRANSITION COMMITTED'; end if;
 if exists(select 1 from review_stage.idempotency where decision_id='NFQ-GATE-102') then raise exception 'PARTIAL IDEMPOTENCY COMMITTED'; end if;
end$$;

-- No mutation of existing audit events by any role (even owner).
do $$begin
 begin
 delete from review_stage.events where decision_id='NFQ-NOM-101';
 raise exception 'EVENT DELETION WAS ALLOWED';
 exception when sqlstate '55000' then null; end;
end$$;


-- Adversarial stage: show authorization, optimistic locking and replay rejection.
insert into review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
values ('NFQ-NOM-103',1,'alias-equivalence','00000000-0000-0000-0000-000000000001',repeat('e',64),repeat('f',64));
insert into review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
values ('NFQ-NOM-103',1,repeat('e',64),'00000000-0000-0000-0000-000000000009');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select public.nfq_stage_review_command('NFQ-NOM-103',1,0,'submit',null,null,'submit-attack01','Authorized submission');
do $guard$begin
  begin
    perform public.nfq_stage_review_command('NFQ-NOM-103',1,1,'review','approve','scientific','review-attack01','Self review');
    raise exception 'SELF REVIEW WAS PERMITTED';
  exception when sqlstate '42501' then null; end;
end$guard$;
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $guard$begin
  begin
    perform public.nfq_stage_review_command('NFQ-NOM-103',1,1,'review','approve','scientific','review-attack02','Forged role');
    raise exception 'UNGRANTED ROLE WAS ACCEPTED';
  exception when sqlstate '42501' then null; end;
end$guard$;
reset role;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $guard$begin
  begin
    perform public.nfq_stage_review_command('NFQ-NOM-103',1,0,'review','approve','scientific','review-attack03','Stale version');
    raise exception 'STALE UPDATE WAS PERMITTED';
  exception when sqlstate '40001' then null; end;
end$guard$;
select public.nfq_stage_review_command('NFQ-NOM-103',1,1,'review','approve','scientific','review-attack04','First scientific review');
do $guard$begin
  begin
    perform public.nfq_stage_review_command('NFQ-NOM-103',1,1,'review','approve','scientific','review-attack04','Different payload');
    raise exception 'CHANGED IDEMPOTENCY PAYLOAD WAS PERMITTED';
  exception when sqlstate '23505' then null; end;
end$guard$;
reset role;

do $guard$begin
 if (select count(*) from review_stage.events where decision_id='NFQ-NOM-103') <> 2 then raise exception 'DENIED OPERATIONS WROTE AUDIT'; end if;
 if (select row_version from review_stage.decisions where id='NFQ-NOM-103') <> 2 then raise exception 'DENIED OPERATIONS MUTATED STATE'; end if;
end$guard$;

-- Exposed RPC must not be executable as anonymous. This assumes Supabase
-- would map an unauthenticated browser request to the anon DB role.
set role anon;
do $guard$begin
  begin
    perform public.nfq_stage_review_command('NFQ-NOM-103',1,2,'review','approve','engineering','anonymous-001','Should deny');
    raise exception 'ANON EXECUTION WAS PERMITTED';
  exception when insufficient_privilege then null; end;
end$guard$;
reset role;


select 'PHASE 2I LOCAL TRANSACTION TESTS PASSED' as test_result;
