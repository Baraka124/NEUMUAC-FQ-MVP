-- 14H189–190. Read-only, scoped molecular research discovery.
-- Additive: does not change source review, molecular review or therapy rules.
-- Requires a real active session and active research membership. Approved
-- mechanism claims must be tied to an independently approved source claim.
create index if not exists nfq_molecular_discovery_approved_order
 on nfq_evidence_review.mechanism_claims(submitted_at desc,id desc)
 where status='approved';

create or replace function public.nfq_molecular_evidence_discovery(
 p_category text default null,
 p_variant_id bigint default null,
 p_limit integer default 20,
 p_offset integer default 0
) returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare
 v_actor uuid:=auth.uid();
 v_role text;
 v_records jsonb;
 v_size integer;
begin
 if v_actor is null
  or auth.jwt()->>'role' is distinct from 'authenticated'
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
 if p_category is not null and p_category not in (
  'rna-splicing','protein-synthesis','protein-folding','trafficking',
  'channel-gating','conductance','stability','other')
 then raise exception 'Unknown molecular mechanism category' using errcode='22023';end if;
 if p_variant_id is not null and p_variant_id<1
 then raise exception 'Invalid exact variant identifier' using errcode='22023';end if;
 if p_limit is null or p_limit<1 or p_limit>30
  or p_offset is null or p_offset<0 or p_offset>5000
 then raise exception 'Bounded discovery pagination required' using errcode='22023';end if;

 -- The +1 row is a truthful continuation indicator; no total estimate.
 -- Source bibliography alone never authorizes a molecular assertion.
 with approved_entries as (
  select m.id,m.series_id,m.revision,m.variant_id,m.source_claim_id,
   m.categories,m.interpretation,m.statement,m.exact_locator,
   m.experimental_context,m.limitations,m.submitted_at,
   c.reference_id,c.study_family_id,c.therapy,
   e.title as source_title,e.url as source_url,
   v.legacy_name,v.cdna_name,v.protein_name,v.cftr_class
  from nfq_evidence_review.mechanism_claims m
  join nfq_evidence_review.claims c
   on c.id=m.source_claim_id and c.variant_id=m.variant_id
    and c.status='approved'
  join public.evidence_links e
   on e.id=c.reference_id and e.variant_id=m.variant_id
  join public.variants v on v.id=m.variant_id
  where m.status='approved' and
   (p_category is null or p_category=any(m.categories))
   and (p_variant_id is null or m.variant_id=p_variant_id)
   and (select count(distinct r.reviewer_id)
    from nfq_evidence_review.mechanism_reviews r
    where r.mechanism_id=m.id and r.decision='approve'
     and r.reviewer_id<>m.submitted_by)=2
   and not exists(
    select 1 from nfq_evidence_review.mechanism_reviews r
    where r.mechanism_id=m.id and r.decision='reject'
   )
   and (select count(distinct r.reviewer_id)
    from nfq_evidence_review.reviews r
    join nfq_evidence_review.claims c2 on c2.id=r.claim_id
    where c2.id=c.id and r.decision='approve'
     and r.reviewer_id<>c2.submitted_by)=2
  order by m.submitted_at desc,m.id desc
  limit p_limit+1 offset p_offset
 ), page as (
  select * from approved_entries
  order by submitted_at desc,id desc limit p_limit
 )
 select coalesce(jsonb_agg(jsonb_build_object(
  'id',id::text,'seriesId',series_id::text,'revision',revision,
  'variantId',variant_id::text,'sourceClaimId',source_claim_id::text,
  'categories',to_jsonb(categories),'interpretation',interpretation,
  'statement',statement,'exactLocator',exact_locator,
  'experimentalContext',experimental_context,'limitations',limitations,
  'submittedAt',submitted_at,'referenceId',reference_id,
  'studyFamilyId',study_family_id,'therapy',therapy,
  'sourceTitle',source_title,'sourceUrl',source_url,
  'legacyName',legacy_name,'cdnaName',cdna_name,'proteinName',protein_name,
  'recordedClass',cftr_class
 ) order by submitted_at desc,id desc),'[]'::jsonb)
 into v_records from page;

 with approved_entries as (
  select m.id from nfq_evidence_review.mechanism_claims m
  join nfq_evidence_review.claims c
   on c.id=m.source_claim_id and c.variant_id=m.variant_id and c.status='approved'
  join public.evidence_links e
   on e.id=c.reference_id and e.variant_id=m.variant_id
  where m.status='approved'
   and (p_category is null or p_category=any(m.categories))
   and (p_variant_id is null or m.variant_id=p_variant_id)
   and (select count(distinct r.reviewer_id)
    from nfq_evidence_review.mechanism_reviews r
    where r.mechanism_id=m.id and r.decision='approve'
     and r.reviewer_id<>m.submitted_by)=2
   and not exists(select 1 from nfq_evidence_review.mechanism_reviews r
    where r.mechanism_id=m.id and r.decision='reject')
   and (select count(distinct r.reviewer_id)
    from nfq_evidence_review.reviews r
    where r.claim_id=c.id and r.decision='approve'
     and r.reviewer_id<>c.submitted_by)=2
  order by m.submitted_at desc,m.id desc
  limit p_limit+1 offset p_offset
 )
 select count(*) into v_size from approved_entries;
 return jsonb_build_object(
  'source','nfq-approved-molecular-discovery-v1',
  'category',p_category,'variantId',p_variant_id::text,
  'limit',p_limit,'offset',p_offset,
  'hasMore',v_size>p_limit,'records',v_records
 );
end;
$function$;
revoke all on function public.nfq_molecular_evidence_discovery(text,bigint,integer,integer) from public,anon;
grant execute on function public.nfq_molecular_evidence_discovery(text,bigint,integer,integer) to authenticated;
