-- 14H200. PROPOSED ONLY: review and test on staging before deployment.
-- Authenticated expert evidence extraction with server-owned identities/timestamps.
create table if not exists nfq_evidence_review.expert_reference_extractions(
 id uuid primary key default gen_random_uuid(),
 case_id text not null check(length(case_id) between 3 and 100),
 variant_id bigint not null references public.variants(id),
 pmid text not null check(pmid ~ '^[0-9]{7,9}$'),
 reviewer_id uuid not null references auth.users(id),
 submitted_at timestamptz not null default now(),
 source_locator text not null check(length(btrim(source_locator)) between 3 and 240),
 genotype_context text not null check(length(btrim(genotype_context)) between 3 and 300),
 endpoint text not null check(length(btrim(endpoint)) between 3 and 160),
 model_or_cohort text not null check(length(btrim(model_or_cohort)) between 3 and 300),
 finding text not null check(finding in ('supports','does-not-support','inconclusive','not-assessable')),
 claim_id uuid,
 method_notes text not null check(length(btrim(method_notes)) between 3 and 1200),
 unique(case_id,variant_id,reviewer_id)
);
create index if not exists nfq_expert_extract_case
 on nfq_evidence_review.expert_reference_extractions(case_id,variant_id,submitted_at);
create table if not exists nfq_evidence_review.expert_reference_adjudications(
 id uuid primary key default gen_random_uuid(),
 case_id text not null,
 variant_id bigint not null references public.variants(id),
 adjudicator_id uuid not null references auth.users(id),
 submitted_at timestamptz not null default now(),
 final_finding text not null check(final_finding in ('supports','does-not-support','inconclusive','not-assessable')),
 source_locator text not null check(length(btrim(source_locator)) between 3 and 240),
 justification text not null check(length(btrim(justification)) between 20 and 1200),
 accepted_reviewer_ids uuid[] not null check(cardinality(accepted_reviewer_ids)=2),
 unique(case_id,variant_id)
);
create table if not exists nfq_evidence_review.expert_reference_mappings(
 id uuid primary key default gen_random_uuid(),
 case_id text not null,
 variant_id bigint not null references public.variants(id),
 platform_claim_id uuid not null references nfq_evidence_review.claims(id),
 expert_finding text not null check(expert_finding in ('supports','does-not-support','inconclusive','not-assessable')),
 claim_finding text not null check(claim_finding in ('reported-response','reported-no-response','mixed','inconclusive')),
 expert_reported_finding text check(expert_reported_finding in ('reported-response','reported-no-response','mixed','inconclusive')),
 genotype_context text not null,
 endpoint_code text not null,
 endpoint_timepoint text not null,
 source_locator text not null,
 attested_by uuid not null references auth.users(id),
 attested_at timestamptz not null default now(),
 unique(case_id,variant_id)
);
create table if not exists nfq_evidence_review.expert_reference_audit(
 event_id uuid primary key default gen_random_uuid(),
 case_id text not null,
 variant_id bigint not null,
 actor_id uuid not null references auth.users(id),
 action text not null check(action in ('extraction-submitted','adjudication-submitted','mapping-attested')),
 at timestamptz not null default now()
);
alter table nfq_evidence_review.expert_reference_extractions enable row level security;
alter table nfq_evidence_review.expert_reference_adjudications enable row level security;
alter table nfq_evidence_review.expert_reference_mappings enable row level security;
alter table nfq_evidence_review.expert_reference_audit enable row level security;
revoke all on nfq_evidence_review.expert_reference_extractions from public,anon,authenticated;
revoke all on nfq_evidence_review.expert_reference_adjudications from public,anon,authenticated;
revoke all on nfq_evidence_review.expert_reference_mappings from public,anon,authenticated;
revoke all on nfq_evidence_review.expert_reference_audit from public,anon,authenticated;

-- Supabase PostgREST RPC: all writes derive actors from auth.uid().
-- Schema-local storage is not exposed to anonymous or authenticated REST table reads.
create or replace function public.nfq_expert_reference_registry(
 p_action text,p_case_id text,p_variant_id bigint,p_payload jsonb default null
) returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_pmid text;
 v_payload jsonb:=coalesce(p_payload,'{}'::jsonb);
 v_count integer;
 v_reviewers uuid[];
 v_a nfq_evidence_review.expert_reference_extractions%rowtype;
 v_b nfq_evidence_review.expert_reference_extractions%rowtype;
 v_claim nfq_evidence_review.claims%rowtype;
 v_is_disputed boolean;
 v_extracts jsonb;
 v_adjudication jsonb;
 v_mapping jsonb;
 v_audit jsonb;
begin
 if v_actor is null or auth.jwt()->>'role' is distinct from 'authenticated'
  or coalesce(auth.jwt()->>'is_anonymous','false')='true'
  or auth.jwt()->>'session_id' is null
  or not exists(select 1 from auth.sessions s
   where s.id::text=auth.jwt()->>'session_id' and s.user_id=v_actor)
 then raise exception 'Active research session required' using errcode='42501';end if;
 select role into v_role from public.nfq_research_memberships
  where user_id=v_actor and revoked_at is null
   and role in ('contributor','reviewer','administrator');
 if v_role is null then
  raise exception 'Active scientific research membership required' using errcode='42501';end if;
 if p_variant_id is null or p_variant_id<1
  or not exists(select 1 from public.variants where id=p_variant_id)
 then raise exception 'Unknown variant' using errcode='22023';end if;
 v_pmid:=case p_case_id
  when 'g551d-ivacaftor-2011' then '22047557'
  when 'phe508del-mf-eti-2019' then '31697873'
  when 'c1584ga-complex-allele-splicing-2020' then '33375403'
  else null end;
 if v_pmid is null then
  raise exception 'Unknown anchored publication challenge' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_case_id||':'||p_variant_id::text,0));

 if p_action='submit-extraction' then
  if jsonb_typeof(v_payload)<>'object' or
    (select count(*) from jsonb_object_keys(v_payload))<>9 or
    not (v_payload ?& array['caseId','variantId','pmid','sourceLocator',
     'genotypeContext','endpoint','modelOrCohort','finding','claimId','methodNotes']) then
   -- The Omit<ExpertExtraction,...> client sends 10 scientific fields.
   raise exception 'Invalid extraction fields' using errcode='22023';end if;
  if v_payload->>'caseId'<>p_case_id or v_payload->>'variantId'<>p_variant_id::text
    or v_payload->>'pmid'<>v_pmid or
    v_payload->>'finding' not in ('supports','does-not-support','inconclusive','not-assessable') or
    length(btrim(coalesce(v_payload->>'sourceLocator',''))) not between 3 and 240 or
    length(btrim(coalesce(v_payload->>'genotypeContext',''))) not between 3 and 300 or
    length(btrim(coalesce(v_payload->>'endpoint',''))) not between 3 and 160 or
    length(btrim(coalesce(v_payload->>'modelOrCohort',''))) not between 3 and 300 or
    length(btrim(coalesce(v_payload->>'methodNotes',''))) not between 3 and 1200 then
   raise exception 'Invalid source-specific extraction' using errcode='22023';end if;
  select count(*) into v_count from nfq_evidence_review.expert_reference_extractions
   where case_id=p_case_id and variant_id=p_variant_id;
  if v_count>=2 then raise exception 'Expert extraction slots complete' using errcode='23505';end if;
  insert into nfq_evidence_review.expert_reference_extractions(
   case_id,variant_id,pmid,reviewer_id,source_locator,genotype_context,endpoint,
   model_or_cohort,finding,claim_id,method_notes)
  values(p_case_id,p_variant_id,v_pmid,v_actor,
   btrim(v_payload->>'sourceLocator'),btrim(v_payload->>'genotypeContext'),
   btrim(v_payload->>'endpoint'),btrim(v_payload->>'modelOrCohort'),
   v_payload->>'finding',case when jsonb_typeof(v_payload->'claimId')='string'
    then (v_payload->>'claimId')::uuid else null end,
   btrim(v_payload->>'methodNotes'));
  insert into nfq_evidence_review.expert_reference_audit(case_id,variant_id,actor_id,action)
   values(p_case_id,p_variant_id,v_actor,'extraction-submitted');
 elsif p_action='adjudicate' then
  if v_role not in ('reviewer','administrator') then
   raise exception 'Adjudicator role required' using errcode='42501';end if;
  select * into v_a from nfq_evidence_review.expert_reference_extractions
   where case_id=p_case_id and variant_id=p_variant_id order by submitted_at,id limit 1;
  select * into v_b from nfq_evidence_review.expert_reference_extractions
   where case_id=p_case_id and variant_id=p_variant_id order by submitted_at,id offset 1 limit 1;
  if v_a.id is null or v_b.id is null or v_actor in (v_a.reviewer_id,v_b.reviewer_id)
   then raise exception 'Two other independent reviewers required' using errcode='42501';end if;
  v_is_disputed:=(v_a.finding,v_a.genotype_context,v_a.endpoint,v_a.model_or_cohort,v_a.claim_id)
   is distinct from (v_b.finding,v_b.genotype_context,v_b.endpoint,v_b.model_or_cohort,v_b.claim_id);
  if not v_is_disputed then raise exception 'There is no scientific disagreement to adjudicate' using errcode='22023';end if;
  if jsonb_typeof(v_payload)<>'object' or
   (select count(*) from jsonb_object_keys(v_payload))<>6 or
   not (v_payload ?& array['caseId','variantId','finalFinding','sourceLocator','justification','acceptedReviewerIds'])
   or v_payload->>'caseId'<>p_case_id or v_payload->>'variantId'<>p_variant_id::text or
   v_payload->>'finalFinding' not in ('supports','does-not-support','inconclusive','not-assessable') or
   length(btrim(coalesce(v_payload->>'sourceLocator',''))) not between 3 and 240 or
   length(btrim(coalesce(v_payload->>'justification',''))) not between 20 and 1200 or
   jsonb_typeof(v_payload->'acceptedReviewerIds')<>'array'
  then raise exception 'Malformed third-party adjudication' using errcode='22023';end if;
  select array_agg(value::uuid order by value) into v_reviewers
   from jsonb_array_elements_text(v_payload->'acceptedReviewerIds') value;
  if cardinality(v_reviewers)<>2 or
   v_reviewers<>array(select x from unnest(array[v_a.reviewer_id,v_b.reviewer_id]) x order by x)
  then raise exception 'Adjudication reviewer IDs mismatch' using errcode='22023';end if;
  insert into nfq_evidence_review.expert_reference_adjudications(
   case_id,variant_id,adjudicator_id,final_finding,source_locator,justification,accepted_reviewer_ids)
   values(p_case_id,p_variant_id,v_actor,v_payload->>'finalFinding',
    btrim(v_payload->>'sourceLocator'),btrim(v_payload->>'justification'),v_reviewers);
  insert into nfq_evidence_review.expert_reference_audit(case_id,variant_id,actor_id,action)
   values(p_case_id,p_variant_id,v_actor,'adjudication-submitted');
 elsif p_action='attest-mapping' then
  if v_role not in ('reviewer','administrator') then
   raise exception 'Qualified mapping attestor required' using errcode='42501';end if;
  select array_agg(reviewer_id) into v_reviewers
   from nfq_evidence_review.expert_reference_extractions
   where case_id=p_case_id and variant_id=p_variant_id;
  if cardinality(v_reviewers)<>2 or v_actor=any(v_reviewers) or
    exists(select 1 from nfq_evidence_review.expert_reference_adjudications
     where case_id=p_case_id and variant_id=p_variant_id and adjudicator_id=v_actor)
  then raise exception 'Independent mapping attestor required' using errcode='42501';end if;
  if jsonb_typeof(v_payload)<>'object' or
   (select count(*) from jsonb_object_keys(v_payload))<>11 or
   not (v_payload ?& array['caseId','variantId','platformClaimId','expertFinding',
    'claimFinding','expertReportedFinding','genotypeContext','endpointCode',
    'endpointTimepoint','sourceLocator','mappingVersion'])
  then raise exception 'Invalid mapping contract' using errcode='22023';end if;
  select * into v_claim from nfq_evidence_review.claims
   where id=(v_payload->>'platformClaimId')::uuid and variant_id=p_variant_id
    and status='approved';
  if not found or v_claim.finding<>v_payload->>'claimFinding' or
    v_payload->>'caseId'<>p_case_id or v_payload->>'variantId'<>p_variant_id::text or
    v_payload->>'mappingVersion'<>'1'
  then raise exception 'Mapping not linked to reviewed source claim' using errcode='22023';end if;
  if not exists(select 1 from nfq_evidence_review.expert_reference_adjudications
    where case_id=p_case_id and variant_id=p_variant_id)
   and exists(select 1 from nfq_evidence_review.expert_reference_extractions e
     where e.case_id=p_case_id and e.variant_id=p_variant_id
     and e.finding is distinct from v_payload->>'expertFinding')
  then raise exception 'Expert disagreement remains unresolved' using errcode='22023';end if;
  insert into nfq_evidence_review.expert_reference_mappings(
   case_id,variant_id,platform_claim_id,expert_finding,claim_finding,
   expert_reported_finding,genotype_context,endpoint_code,endpoint_timepoint,
   source_locator,attested_by)
  values(p_case_id,p_variant_id,v_claim.id,v_payload->>'expertFinding',
   v_payload->>'claimFinding',nullif(v_payload->>'expertReportedFinding',''),
   btrim(v_payload->>'genotypeContext'),btrim(v_payload->>'endpointCode'),
   btrim(v_payload->>'endpointTimepoint'),btrim(v_payload->>'sourceLocator'),v_actor);
  insert into nfq_evidence_review.expert_reference_audit(case_id,variant_id,actor_id,action)
   values(p_case_id,p_variant_id,v_actor,'mapping-attested');
 elsif p_action<>'list' then
  raise exception 'Unknown registry operation' using errcode='22023';
 end if;

 select coalesce(jsonb_agg(jsonb_build_object(
   'caseId',e.case_id,'variantId',e.variant_id::text,'pmid',e.pmid,
   'reviewerId',e.reviewer_id::text,'submittedAt',e.submitted_at,
   'sourceLocator',e.source_locator,'genotypeContext',e.genotype_context,
   'endpoint',e.endpoint,'modelOrCohort',e.model_or_cohort,'finding',e.finding,
   'claimId',e.claim_id::text,'methodNotes',e.method_notes)
   order by e.submitted_at,e.id),'[]'::jsonb) into v_extracts
 from nfq_evidence_review.expert_reference_extractions e
 where e.case_id=p_case_id and e.variant_id=p_variant_id;
 select jsonb_build_object('caseId',a.case_id,'variantId',a.variant_id::text,
   'adjudicatorId',a.adjudicator_id::text,'submittedAt',a.submitted_at,
   'finalFinding',a.final_finding,'sourceLocator',a.source_locator,
   'justification',a.justification,'acceptedReviewerIds',a.accepted_reviewer_ids)
 into v_adjudication from nfq_evidence_review.expert_reference_adjudications a
 where a.case_id=p_case_id and a.variant_id=p_variant_id;
 select jsonb_build_object('caseId',m.case_id,'variantId',m.variant_id::text,
  'platformClaimId',m.platform_claim_id::text,'expertFinding',m.expert_finding,
  'claimFinding',m.claim_finding,'expertReportedFinding',m.expert_reported_finding,
  'genotypeContext',m.genotype_context,'endpointCode',m.endpoint_code,
  'endpointTimepoint',m.endpoint_timepoint,'sourceLocator',m.source_locator,
  'attestedBy',m.attested_by::text,'attestedAt',m.attested_at,'mappingVersion',1)
 into v_mapping from nfq_evidence_review.expert_reference_mappings m
 where m.case_id=p_case_id and m.variant_id=p_variant_id;
 select coalesce(jsonb_agg(jsonb_build_object('eventId',a.event_id::text,
  'action',a.action,'actorId',a.actor_id::text,'at',a.at) order by a.at,a.event_id),
  '[]'::jsonb) into v_audit
 from nfq_evidence_review.expert_reference_audit a
 where a.case_id=p_case_id and a.variant_id=p_variant_id;
 return jsonb_build_object('source','nfq-authenticated-expert-registry-v1',
  'caseId',p_case_id,'variantId',p_variant_id::text,
  'extracts',v_extracts,'adjudication',v_adjudication,'mapping',v_mapping,'audit',v_audit);
end;
$fn$;
revoke all on function public.nfq_expert_reference_registry(text,text,bigint,jsonb) from public,anon;
grant execute on function public.nfq_expert_reference_registry(text,text,bigint,jsonb) to authenticated;
