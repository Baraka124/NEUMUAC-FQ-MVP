-- 14H187-188: independently adjudicated molecular interpretations.
-- ADDITIVE, review-required migration. Deploy after independent schema review.
-- Existing nfq_evidence_review.claims approval is necessary but NOT sufficient
-- for approval of a new molecular mechanism interpretation.
create table if not exists nfq_evidence_review.mechanism_claims (
 id uuid primary key default gen_random_uuid(),
 series_id uuid not null,
 revision integer not null check(revision between 1 and 100),
 parent_id uuid references nfq_evidence_review.mechanism_claims(id),
 variant_id bigint not null references public.variants(id),
 source_claim_id uuid not null references nfq_evidence_review.claims(id),
 categories text[] not null,
 interpretation text not null check(interpretation in
  ('reported-observation','mechanistic-hypothesis','contradictory-or-uncertain')),
 statement text not null, exact_locator text not null,
 experimental_context text not null, limitations text not null,
 status text not null default 'pending'
  check(status in ('pending','approved','rejected','withdrawn','superseded')),
 submitted_by uuid not null references auth.users(id),
 submitted_at timestamptz not null default now(),
 finalized_at timestamptz,
 unique(series_id,revision),
 check(cardinality(categories) between 1 and 5),
 check(categories <@ array[
  'rna-splicing','protein-synthesis','protein-folding','trafficking',
  'channel-gating','conductance','stability','other']::text[]),
 check(char_length(btrim(statement)) between 25 and 850),
 check(char_length(btrim(exact_locator)) between 8 and 240),
 check(char_length(btrim(experimental_context)) between 15 and 350),
 check(char_length(btrim(limitations)) between 20 and 500),
 check((revision=1 and parent_id is null) or (revision>1 and parent_id is not null))
);
create unique index if not exists nfq_mechanism_one_approved_per_series
 on nfq_evidence_review.mechanism_claims(series_id) where status='approved';
create index if not exists nfq_mechanism_variant_status
 on nfq_evidence_review.mechanism_claims(variant_id,status,submitted_at desc);
create table if not exists nfq_evidence_review.mechanism_reviews (
 id uuid primary key default gen_random_uuid(),
 mechanism_id uuid not null references nfq_evidence_review.mechanism_claims(id),
 reviewer_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approve','reject')),
 note text not null check(char_length(btrim(note)) between 20 and 900),
 reviewed_at timestamptz not null default now(),
 unique(mechanism_id,reviewer_id)
);
create table if not exists nfq_evidence_review.mechanism_events (
 id bigint generated always as identity primary key,
 mechanism_id uuid not null references nfq_evidence_review.mechanism_claims(id),
 actor_id uuid not null references auth.users(id),
 action text not null check(action in
  ('submitted','revised','review-approved','review-rejected','approved','rejected','superseded','withdrawn')),
 at timestamptz not null default now()
);
alter table nfq_evidence_review.mechanism_claims enable row level security;
alter table nfq_evidence_review.mechanism_reviews enable row level security;
alter table nfq_evidence_review.mechanism_events enable row level security;
revoke all on nfq_evidence_review.mechanism_claims from public,anon,authenticated;
revoke all on nfq_evidence_review.mechanism_reviews from public,anon,authenticated;
revoke all on nfq_evidence_review.mechanism_events from public,anon,authenticated;

create or replace function public.nfq_molecular_mechanism_reviews(
 p_action text,p_variant_id bigint,p_id uuid default null,
 p_payload jsonb default null,p_expected_revision integer default null
) returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_claim nfq_evidence_review.mechanism_claims%rowtype;
 v_parent nfq_evidence_review.mechanism_claims%rowtype;
 v_source nfq_evidence_review.claims%rowtype;
 v_payload jsonb:=coalesce(p_payload,'{}'::jsonb);
 v_categories text[];
 v_keys text[]:=array['sourceClaimId','categories','interpretation','statement',
                             'exactLocator','experimentalContext','limitations'];
 v_approved integer;
 v_new uuid;
 v_series uuid;
 v_revision integer;
 v_result jsonb;
 v_note text;
 v_decision text;
begin
 if v_actor is null or auth.jwt()->>'role' is distinct from 'authenticated'
    or coalesce(auth.jwt()->>'is_anonymous','false')='true'
    or auth.jwt()->>'session_id' is null
    or not exists(select 1 from auth.sessions s
      where s.id::text=auth.jwt()->>'session_id' and s.user_id=v_actor)
 then raise exception 'Active authenticated session required' using errcode='42501'; end if;
 select m.role into v_role from public.nfq_research_memberships m
  where m.user_id=v_actor and m.revoked_at is null
    and m.role in ('contributor','reviewer','administrator');
 if v_role is null then
  raise exception 'Active research membership required' using errcode='42501';
 end if;
 if p_variant_id is null or p_variant_id<1 or
    not exists(select 1 from public.variants where id=p_variant_id)
 then raise exception 'Invalid variant identity' using errcode='22023'; end if;

 if p_action='list' then
  if p_id is not null or p_expected_revision is not null or v_payload<>'{}'::jsonb
  then raise exception 'Invalid list arguments' using errcode='22023'; end if;
  if (select count(*) from nfq_evidence_review.mechanism_claims
      where variant_id=p_variant_id)>200
  then raise exception 'Mechanism inventory exceeds supported bound' using errcode='54000'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
   'id',c.id::text,'seriesId',c.series_id::text,'revision',c.revision,
   'parentId',c.parent_id::text,'variantId',c.variant_id::text,
   'sourceClaimId',c.source_claim_id::text,
   'categories',to_jsonb(c.categories),'interpretation',c.interpretation,
   'statement',c.statement,'exactLocator',c.exact_locator,
   'experimentalContext',c.experimental_context,'limitations',c.limitations,
   'status',c.status,'submittedAt',c.submitted_at,
   'submittedByMe',c.submitted_by=v_actor,
   'canReview',(v_role in ('reviewer','administrator')
    and c.submitted_by<>v_actor and c.status='pending' and
    not exists(select 1 from nfq_evidence_review.mechanism_reviews r
     where r.mechanism_id=c.id and r.reviewer_id=v_actor)),
   'reviewCount',(select count(*) from nfq_evidence_review.mechanism_reviews r
     where r.mechanism_id=c.id and r.decision='approve'),
   'reviewSeals',case when c.status='approved' then coalesce((
    select jsonb_agg('attestation:'||r.id::text order by r.reviewed_at,r.id)
    from nfq_evidence_review.mechanism_reviews r
    where r.mechanism_id=c.id and r.decision='approve'),'[]'::jsonb)
    else '[]'::jsonb end,
   'events',coalesce((select jsonb_agg(jsonb_build_object(
     'action',e.action,'at',e.at) order by e.id)
     from nfq_evidence_review.mechanism_events e
     where e.mechanism_id=c.id),'[]'::jsonb)
  ) order by c.submitted_at desc,c.id desc),'[]'::jsonb)
  into v_result from nfq_evidence_review.mechanism_claims c
  where c.variant_id=p_variant_id;
  return jsonb_build_object('variantId',p_variant_id::text,
   'source','nfq-independent-molecular-review-v1','claims',v_result);
 end if;

 if p_action in ('submit','revise') then
  if v_payload is null or jsonb_typeof(v_payload)<>'object'
     or (select count(*) from jsonb_object_keys(v_payload))<>7
     or exists(select 1 from jsonb_object_keys(v_payload) x
       where not (x=any(v_keys)))
     or p_action='submit' and (p_id is not null or p_expected_revision is not null)
  then raise exception 'Malformed molecular evidence proposal' using errcode='22023'; end if;
  if jsonb_typeof(v_payload->'categories')<>'array'
    or jsonb_array_length(v_payload->'categories') not between 1 and 5
    or exists(select 1 from jsonb_array_elements(v_payload->'categories') el
      where jsonb_typeof(el)<>'string')
  then raise exception 'Invalid mechanism categories' using errcode='22023'; end if;
  select array_agg(value) into v_categories
    from jsonb_array_elements_text(v_payload->'categories') value;
  if (select count(distinct x) from unnest(v_categories) x)<>cardinality(v_categories)
    or not (v_categories <@ array[
      'rna-splicing','protein-synthesis','protein-folding','trafficking',
      'channel-gating','conductance','stability','other']::text[])
    or v_payload->>'interpretation' not in
      ('reported-observation','mechanistic-hypothesis','contradictory-or-uncertain')
    or char_length(btrim(coalesce(v_payload->>'statement',''))) not between 25 and 850
    or char_length(btrim(coalesce(v_payload->>'exactLocator',''))) not between 8 and 240
    or char_length(btrim(coalesce(v_payload->>'experimentalContext',''))) not between 15 and 350
    or char_length(btrim(coalesce(v_payload->>'limitations',''))) not between 20 and 500
    or (v_payload->>'statement') ~ '[[:cntrl:]]'
    or (v_payload->>'exactLocator') ~ '[[:cntrl:]]'
    or (v_payload->>'experimentalContext') ~ '[[:cntrl:]]'
    or (v_payload->>'limitations') ~ '[[:cntrl:]]'
  then raise exception 'Invalid molecular research statement/context' using errcode='22023'; end if;
  select * into v_source from nfq_evidence_review.claims
   where id=(v_payload->>'sourceClaimId')::uuid and variant_id=p_variant_id;
  if not found or v_source.status<>'approved' then
   raise exception 'An approved independent source claim is required' using errcode='22023';
  end if;
  if p_action='submit' then
   v_series:=gen_random_uuid();v_revision:=1;
  else
   if p_id is null or p_expected_revision is null then
    raise exception 'Expected parent revision required' using errcode='22023';end if;
   select * into v_parent from nfq_evidence_review.mechanism_claims
     where id=p_id and variant_id=p_variant_id for update;
   if not found or v_parent.revision<>p_expected_revision or
      v_parent.status not in ('approved','rejected') or
      (v_parent.submitted_by<>v_actor and v_role<>'administrator')
   then raise exception 'Revision denied or stale' using errcode='42501';end if;
   perform pg_advisory_xact_lock(hashtextextended(v_parent.series_id::text,0));
   select max(revision) into v_revision from nfq_evidence_review.mechanism_claims
      where series_id=v_parent.series_id;
   if v_revision<>p_expected_revision then
    raise exception 'A newer revision exists' using errcode='40001';end if;
   if v_parent.source_claim_id<>(v_payload->>'sourceClaimId')::uuid then
    raise exception 'Source identity cannot be silently replaced within a series'
      using errcode='22023';end if;
   v_series:=v_parent.series_id;v_revision:=v_revision+1;
  end if;
  insert into nfq_evidence_review.mechanism_claims(
   series_id,revision,parent_id,variant_id,source_claim_id,
   categories,interpretation,statement,exact_locator,experimental_context,
   limitations,submitted_by
  ) values(
   v_series,v_revision,case when p_action='revise' then p_id else null end,
   p_variant_id,v_source.id,v_categories,v_payload->>'interpretation',
   btrim(v_payload->>'statement'),btrim(v_payload->>'exactLocator'),
   btrim(v_payload->>'experimentalContext'),btrim(v_payload->>'limitations'),v_actor
  ) returning id into v_new;
  insert into nfq_evidence_review.mechanism_events(mechanism_id,actor_id,action)
   values(v_new,v_actor,case when p_action='submit' then 'submitted' else 'revised' end);
  return jsonb_build_object('id',v_new::text,'status','pending','revision',v_revision);
 end if;

 if p_action='review' then
  if p_id is null or p_expected_revision is null or v_role not in ('reviewer','administrator')
    or jsonb_typeof(v_payload)<>'object' or
    (select count(*) from jsonb_object_keys(v_payload))<>2 or
    not (v_payload ? 'decision' and v_payload ? 'note')
  then raise exception 'Scientific review request denied' using errcode='42501';end if;
  v_decision:=v_payload->>'decision';v_note:=btrim(coalesce(v_payload->>'note',''));
  if v_decision not in ('approve','reject') or
    char_length(v_note) not between 20 and 900 or v_note ~ '[[:cntrl:]]'
  then raise exception 'Invalid scientific review' using errcode='22023';end if;
  select * into v_claim from nfq_evidence_review.mechanism_claims
    where id=p_id and variant_id=p_variant_id for update;
  if not found or v_claim.revision<>p_expected_revision or
    v_claim.status<>'pending' or v_claim.submitted_by=v_actor
    or exists(select 1 from nfq_evidence_review.mechanism_reviews
      where mechanism_id=p_id and reviewer_id=v_actor)
  then raise exception 'Independent reviewer or current revision required'
    using errcode='42501';end if;
  if not exists(select 1 from nfq_evidence_review.claims c
    where c.id=v_claim.source_claim_id and c.variant_id=p_variant_id and c.status='approved')
  then raise exception 'Underlying source claim is no longer approved'
    using errcode='22023';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_claim.series_id::text,0));
  insert into nfq_evidence_review.mechanism_reviews(mechanism_id,reviewer_id,decision,note)
   values(p_id,v_actor,v_decision,v_note);
  insert into nfq_evidence_review.mechanism_events(mechanism_id,actor_id,action)
   values(p_id,v_actor,case when v_decision='approve' then 'review-approved' else 'review-rejected' end);
  if v_decision='reject' then
   update nfq_evidence_review.mechanism_claims
    set status='rejected',finalized_at=now() where id=p_id;
   insert into nfq_evidence_review.mechanism_events(mechanism_id,actor_id,action)
    values(p_id,v_actor,'rejected');
   return jsonb_build_object('id',p_id::text,'status','rejected');
  end if;
  select count(*) into v_approved from nfq_evidence_review.mechanism_reviews
   where mechanism_id=p_id and decision='approve';
  if v_approved=2 then
   update nfq_evidence_review.mechanism_claims
    set status='superseded',finalized_at=now()
    where series_id=v_claim.series_id and status='approved';
   update nfq_evidence_review.mechanism_claims
    set status='approved',finalized_at=now() where id=p_id;
   insert into nfq_evidence_review.mechanism_events(mechanism_id,actor_id,action)
    values(p_id,v_actor,'approved');
   return jsonb_build_object('id',p_id::text,'status','approved');
  end if;
  return jsonb_build_object('id',p_id::text,'status','pending');
 end if;

 raise exception 'Unknown molecular review operation' using errcode='22023';
end;
$function$;
revoke all on function public.nfq_molecular_mechanism_reviews(text,bigint,uuid,jsonb,integer) from public,anon;
grant execute on function public.nfq_molecular_mechanism_reviews(text,bigint,uuid,jsonb,integer) to authenticated;
