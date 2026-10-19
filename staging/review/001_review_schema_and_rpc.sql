-- PHASE 2I -- EXPERIMENTAL ONLY. DO NOT APPLY TO PRODUCTION.
-- Execute only in disposable local PostgreSQL CI or an explicitly isolated
-- nonproduction Supabase project after database-owner review.
-- Intentionally NOT in supabase/migrations.
begin;

create schema if not exists review_stage;
revoke all on schema review_stage from public, anon, authenticated;
revoke create on schema public from public;

create table review_stage.decisions (
  id text primary key check (id ~ '^NFQ-(NOM|GATE)-[0-9]{3}$'),
  revision integer not null check (revision > 0),
  kind text not null check (kind in ('alias-equivalence','search-disposition')),
  proposer_id uuid not null,
  phase text not null default 'draft'
    check (phase in ('draft','under-review','ready-for-release','rejected','released')),
  row_version integer not null default 0 check (row_version >= 0),
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  ruleset_hash text not null check (ruleset_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, revision)
);

create table review_stage.actor_grants (
  actor_id uuid not null,
  role_name text not null check (role_name in ('scientific','engineering','privacy','release-manager')),
  granted_by uuid not null,
  enabled boolean not null default true,
  granted_at timestamptz not null default now(),
  primary key (actor_id, role_name)
);

-- Written only by a future trusted evidence-verification service, never the
-- browser. Tied to the exact scientific content digest and current revision.
create table review_stage.evidence_checks (
  decision_id text not null,
  revision integer not null,
  evidence_hash text not null check (evidence_hash ~ '^[a-f0-9]{64}$'),
  verified_by uuid not null,
  verified_at timestamptz not null default now(),
  primary key (decision_id, revision),
  foreign key (decision_id, revision) references review_stage.decisions(id, revision)
);

create table review_stage.reviews (
  decision_id text not null,
  revision integer not null,
  role_name text not null check (role_name in ('scientific','engineering','privacy')),
  reviewer_id uuid not null,
  verdict text not null check (verdict in ('approve','reject')),
  rationale text not null check (length(btrim(rationale)) between 1 and 4000),
  reviewed_at timestamptz not null default now(),
  primary key (decision_id, revision, role_name),
  unique (decision_id, revision, reviewer_id),
  foreign key (decision_id, revision) references review_stage.decisions(id, revision)
);

create table review_stage.release_authorizations (
  decision_id text not null,
  revision integer not null,
  ruleset_hash text not null check (ruleset_hash ~ '^[a-f0-9]{64}$'),
  approved_by uuid not null,
  approved_at timestamptz not null default now(),
  purpose text not null check (length(btrim(purpose)) between 1 and 2000),
  consumed_at timestamptz,
  primary key (decision_id, revision),
  foreign key (decision_id, revision) references review_stage.decisions(id, revision)
);

create table review_stage.events (
  event_id uuid primary key default gen_random_uuid(),
  decision_id text not null references review_stage.decisions(id),
  revision integer not null,
  request_key text not null,
  actor_id uuid not null,
  action text not null check (action in ('submitted','review-approved','review-rejected','released')),
  review_role text,
  previous_phase text not null,
  next_phase text not null,
  previous_version integer not null,
  next_version integer not null,
  reason text not null,
  happened_at timestamptz not null default clock_timestamp(),
  unique (decision_id, request_key),
  check (next_version = previous_version + 1)
);

create table review_stage.idempotency (
  decision_id text not null references review_stage.decisions(id),
  request_key text not null,
  actor_id uuid not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{32}$'),
  result jsonb not null,
  event_id uuid not null unique references review_stage.events(event_id),
  primary key (decision_id, request_key)
);

create function review_stage.no_mutate_events() returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception using errcode = '55000', message = 'append_only_audit';
end;
$$;
create trigger events_append_only before update or delete on review_stage.events
  for each row execute function review_stage.no_mutate_events();
create trigger reviews_append_only before update or delete on review_stage.reviews
  for each row execute function review_stage.no_mutate_events();
create trigger idempotency_append_only before update or delete on review_stage.idempotency
  for each row execute function review_stage.no_mutate_events();

-- RLS is defense in depth. The private SECURITY DEFINER function is owned by
-- the schema owner; it MUST enforce role and actor checks independently.
-- Only the trusted executor receives function EXECUTE, never a browser role.
alter table review_stage.decisions enable row level security;
alter table review_stage.actor_grants enable row level security;
alter table review_stage.evidence_checks enable row level security;
alter table review_stage.reviews enable row level security;
alter table review_stage.release_authorizations enable row level security;
alter table review_stage.events enable row level security;
alter table review_stage.idempotency enable row level security;

revoke all on all tables in schema review_stage from public, anon, authenticated;
revoke all on all functions in schema review_stage from public, anon, authenticated;

-- PRIVATE invocation surface. The future trusted server authenticates
-- credentials, resolves the user identity and binds a transaction-local subject.
-- This function is NOT exposed as a public/authenticated PostgREST RPC.
-- Local tests simulate verified server identity; they cannot prove JWT checks.
create function review_stage.review_command(
  p_decision_id text,
  p_revision integer,
  p_expected_version integer,
  p_action text,
  p_vote text,
  p_role text,
  p_request_key text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $body$
declare
  v_actor uuid := auth.uid();
  v_decision review_stage.decisions%rowtype;
  v_idem review_stage.idempotency%rowtype;
  v_fingerprint text;
  v_next_phase text;
  v_action text;
  v_event_id uuid;
  v_result jsonb;
  v_needed text;
  v_other_needed text;
  v_release review_stage.release_authorizations%rowtype;
begin
  if v_actor is null then
    raise exception using errcode = '28000', message = 'not_authenticated';
  end if;
  if p_decision_id is null or p_revision is null or p_expected_version is null
      or p_expected_version < 0 or p_request_key is null
      or p_request_key !~ '^[a-zA-Z0-9_-]{12,128}$'
      or p_reason is null or length(btrim(p_reason)) not between 1 and 4000
      or p_action is null or p_action not in ('submit','review','release')
      or (p_action <> 'review' and (p_vote is not null or p_role is not null))
      or (p_action = 'review' and (p_vote is null or p_vote not in ('approve','reject')
          or p_role is null or p_role not in ('scientific','engineering','privacy')))
  then
    raise exception using errcode = '22023', message = 'invalid_command';
  end if;

  -- Verified research membership is separate from the specialty-review grant.
  -- The trusted server MUST authenticate the JWT and supply the subject;
  -- a browser may not connect as nfq_review_executor or choose this GUC.
  if not exists (
    select 1 from public.nfq_research_memberships m
    where m.user_id = v_actor and m.revoked_at is null
      and ( (p_action='submit' and m.role in ('contributor','reviewer','administrator'))
         or (p_action='review' and m.role in ('reviewer','administrator'))
         or (p_action='release' and m.role='administrator') )
  ) then
    raise exception using errcode='42501', message='active_membership_required';
  end if;

  -- This row lock is the serialization point. Every write and idempotency
  -- check happens in the SAME function call / PostgreSQL transaction.
  select * into v_decision from review_stage.decisions
    where id = p_decision_id for update;
  if not found or v_decision.revision <> p_revision then
    raise exception using errcode = 'P0001', message = 'revision_mismatch';
  end if;

  v_fingerprint := pg_catalog.md5(pg_catalog.jsonb_build_object(
    'actor',v_actor,'id',p_decision_id,'rev',p_revision,'version',p_expected_version,
    'action',p_action,'vote',p_vote,'role',p_role,'reason',p_reason
  )::text);
  select * into v_idem from review_stage.idempotency
    where decision_id = p_decision_id and request_key = p_request_key;
  if found then
    if v_idem.actor_id <> v_actor then
      raise exception using errcode = '42501', message = 'request_key_owned_by_another_actor';
    end if;
    if v_idem.fingerprint <> v_fingerprint then
      raise exception using errcode = '23505', message = 'request_key_conflict';
    end if;
    return v_idem.result || '{"replayed":true}'::jsonb;
  end if;

  if v_decision.row_version <> p_expected_version then
    raise exception using errcode = '40001', message = 'stale_review_version';
  end if;

  if not exists (
    select 1 from review_stage.evidence_checks e
    where e.decision_id = v_decision.id and e.revision = v_decision.revision
      and e.evidence_hash = v_decision.evidence_hash
  ) then
    raise exception using errcode = '23514', message = 'evidence_not_verified';
  end if;

  if p_action = 'submit' then
    if v_decision.phase <> 'draft' or v_actor <> v_decision.proposer_id then
      raise exception using errcode = '42501', message = 'submit_denied';
    end if;
    v_next_phase := 'under-review';
    v_action := 'submitted';
  elsif p_action = 'review' then
    if v_decision.phase <> 'under-review' or v_actor = v_decision.proposer_id then
      raise exception using errcode = '42501', message = 'review_denied';
    end if;
    v_needed := case when v_decision.kind = 'alias-equivalence' then 'scientific' else 'privacy' end;
    if p_role not in (v_needed,'engineering') or not exists (
      select 1 from review_stage.actor_grants g
      where g.actor_id = v_actor and g.role_name = p_role and g.enabled
    ) then
      raise exception using errcode = '42501', message = 'role_denied';
    end if;
    if exists (
      select 1 from review_stage.reviews a
      where a.decision_id = v_decision.id and a.revision = v_decision.revision
        and (a.reviewer_id = v_actor or a.role_name = p_role)
    ) then
      raise exception using errcode = '23505', message = 'duplicate_review';
    end if;
    insert into review_stage.reviews(
      decision_id,revision,role_name,reviewer_id,verdict,rationale
    ) values (
      v_decision.id,v_decision.revision,p_role,v_actor,p_vote,btrim(p_reason)
    );
    if p_vote = 'reject' then
      v_next_phase := 'rejected';
      v_action := 'review-rejected';
    else
      v_other_needed := case when p_role = 'engineering' then v_needed else 'engineering' end;
      if exists (
        select 1 from review_stage.reviews a
        where a.decision_id = v_decision.id and a.revision = v_decision.revision
          and a.role_name = v_other_needed and a.verdict = 'approve'
      ) then v_next_phase := 'ready-for-release';
      else v_next_phase := 'under-review';
      end if;
      v_action := 'review-approved';
    end if;
  else
    if v_decision.phase <> 'ready-for-release'
       or v_actor = v_decision.proposer_id
       or not exists (
         select 1 from review_stage.actor_grants g
         where g.actor_id = v_actor and g.role_name = 'release-manager' and g.enabled
       ) or exists (
         select 1 from review_stage.reviews a
         where a.decision_id = v_decision.id and a.revision = v_decision.revision
           and a.reviewer_id = v_actor
       )
    then
      raise exception using errcode = '42501', message = 'release_denied';
    end if;
    v_needed := case when v_decision.kind = 'alias-equivalence' then 'scientific' else 'privacy' end;
    if not exists (
      select 1 from review_stage.reviews a
      where a.decision_id=v_decision.id and a.revision=v_decision.revision
        and a.role_name=v_needed and a.verdict='approve'
    ) or not exists (
      select 1 from review_stage.reviews a
      where a.decision_id=v_decision.id and a.revision=v_decision.revision
        and a.role_name='engineering' and a.verdict='approve'
    ) then
      raise exception using errcode = '42501', message = 'missing_independent_approvals';
    end if;
    select * into v_release from review_stage.release_authorizations
      where decision_id = v_decision.id and revision = v_decision.revision
        and ruleset_hash = v_decision.ruleset_hash and consumed_at is null
      for update;
    if not found or v_release.approved_by = v_actor
       or v_release.approved_by = v_decision.proposer_id
       or exists (
         select 1 from review_stage.reviews a
         where a.decision_id=v_decision.id and a.revision=v_decision.revision
           and a.reviewer_id=v_release.approved_by
       ) then
      raise exception using errcode = '42501', message = 'release_authorization_denied';
    end if;
    update review_stage.release_authorizations set consumed_at=clock_timestamp()
      where decision_id=v_decision.id and revision=v_decision.revision;
    v_next_phase := 'released';
    v_action := 'released';
  end if;

  update review_stage.decisions
    set phase = v_next_phase, row_version = row_version + 1, updated_at=clock_timestamp()
    where id=v_decision.id;

  insert into review_stage.events(
    decision_id,revision,request_key,actor_id,action,review_role,
    previous_phase,next_phase,previous_version,next_version,reason
  ) values (
    v_decision.id,v_decision.revision,p_request_key,v_actor,v_action,
    case when p_action='review' then p_role else null end,
    v_decision.phase,v_next_phase,v_decision.row_version,v_decision.row_version + 1,btrim(p_reason)
  ) returning event_id into v_event_id;

  v_result := pg_catalog.jsonb_build_object(
    'decisionId', v_decision.id,'revision',v_decision.revision,
    'phase',v_next_phase,'version',v_decision.row_version + 1,
    'eventId',v_event_id,'replayed',false
  );
  insert into review_stage.idempotency(decision_id,request_key,actor_id,fingerprint,result,event_id)
    values (v_decision.id,p_request_key,v_actor,v_fingerprint,v_result,v_event_id);
  return v_result;
end;
$body$;


-- 14G4A: a deliberately narrow, read-only reviewer queue. Never expose
-- review_stage tables or this private function to anon/authenticated.
-- No proposer IDs, reviewers, rationale or unreviewed scientific claims.
create function review_stage.review_queue(p_offset integer default 0)
returns jsonb
language plpgsql
security definer
set search_path=''
as $queue$
declare
 v_actor uuid:=auth.uid();
 v_row record;
 v_count integer:=0;
 v_items jsonb:='[]'::jsonb;
 v_more boolean:=false;
begin
 if v_actor is null then
  raise exception using errcode='28000',message='not_authenticated';
 end if;
 if p_offset is null or p_offset<0 or p_offset>1000 or p_offset%20<>0 then
  raise exception using errcode='22023',message='invalid_page';
 end if;
 if not exists(
  select 1 from public.nfq_research_memberships m
  where m.user_id=v_actor and m.revoked_at is null
    and m.role in ('reviewer','administrator')
 ) or not exists(
  select 1 from review_stage.actor_grants g
  where g.actor_id=v_actor and g.enabled
    and g.role_name in ('scientific','engineering','privacy','release-manager')
 ) then
  raise exception using errcode='42501',message='review_queue_denied';
 end if;
 for v_row in
  select id,revision,kind,phase,row_version,created_at
  from review_stage.decisions
  where phase in ('under-review','ready-for-release')
  order by created_at desc,id asc
  limit 21 offset p_offset
 loop
  if v_count=20 then v_more:=true; exit; end if;
  v_items:=v_items||jsonb_build_array(jsonb_build_object(
    'decisionId',v_row.id,
    'revision',v_row.revision,
    'kind',v_row.kind,
    'phase',v_row.phase,
    'version',v_row.row_version,
    'createdAt',to_char(v_row.created_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
  v_count:=v_count+1;
 end loop;
 return jsonb_build_object('items',v_items,'hasMore',v_more,'offset',p_offset);
end;
$queue$;

revoke all on function review_stage.review_queue(integer)
  from public,anon,authenticated;
grant execute on function review_stage.review_queue(integer)
  to nfq_review_executor;

revoke all on function review_stage.review_command(
 text,integer,integer,text,text,text,text,text
) from public, anon, authenticated;
grant execute on function review_stage.review_command(
 text,integer,integer,text,text,text,text,text
) to nfq_review_executor;
-- This role is held by a trusted application service, never by a browser.
-- The schema is deliberately outside the exposed Supabase Data API.
grant usage on schema review_stage to nfq_review_executor;
commit;
