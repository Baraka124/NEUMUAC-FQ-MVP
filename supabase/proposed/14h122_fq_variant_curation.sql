-- 14H122 / FQ only: narrow, independently reviewed variant nomenclature curation.
-- No therapy / clinical classification fields; no writes by browser roles to public.variants.
-- Apply to an isolated FQ test project first; then run negative authorization and conflict tests.
create table if not exists public.nfq_variant_curation_proposals (
 id bigint generated always as identity primary key,
 variant_id bigint not null references public.variants(id) on delete restrict,
 field_name text not null check (field_name in ('legacy_name','protein_name','cdna_name','alt_names')),
 recorded_value text,
 proposed_value text not null check (char_length(btrim(proposed_value)) between 2 and 500),
 rationale text not null check (char_length(btrim(rationale)) between 20 and 900),
 source_reference text not null check (char_length(btrim(source_reference)) between 8 and 250),
 submitted_by uuid not null references auth.users(id) on delete restrict,
 submitted_at timestamptz not null default now(),
 status text not null default 'submitted' check (status in ('submitted','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 review_note text,
 constraint nfq_variant_curation_decision_consistency check (
  (status='submitted' and reviewed_by is null and reviewed_at is null and review_note is null)
  or (status<>'submitted' and reviewed_by is not null and reviewed_at is not null and review_note is not null)
 )
);
create unique index if not exists nfq_variant_curation_one_pending_field
 on public.nfq_variant_curation_proposals(variant_id,field_name) where status='submitted';
create index if not exists nfq_variant_curation_review_queue
 on public.nfq_variant_curation_proposals(status,submitted_at,id);
create table if not exists public.nfq_variant_curation_events (
 id bigint generated always as identity primary key,
 proposal_id bigint not null references public.nfq_variant_curation_proposals(id) on delete restrict,
 variant_id bigint not null references public.variants(id) on delete restrict,
 event_type text not null check (event_type in ('submitted','approved','rejected')),
 field_name text not null check (field_name in ('legacy_name','protein_name','cdna_name','alt_names')),
 before_value text,
 after_value text,
 actor_id uuid not null references auth.users(id) on delete restrict,
 recorded_at timestamptz not null default now()
);
alter table public.nfq_variant_curation_proposals enable row level security;
alter table public.nfq_variant_curation_events enable row level security;
revoke all on public.nfq_variant_curation_proposals from public,anon,authenticated;
revoke all on public.nfq_variant_curation_events from public,anon,authenticated;
grant select on public.nfq_variant_curation_proposals to authenticated;
grant select on public.nfq_variant_curation_events to authenticated;

drop policy if exists nfq_variant_curations_read_authorized on public.nfq_variant_curation_proposals;
create policy nfq_variant_curations_read_authorized on public.nfq_variant_curation_proposals
 for select to authenticated using (
  submitted_by=(select auth.uid())
  or exists (
   select 1 from public.nfq_research_memberships m
   where m.user_id=(select auth.uid()) and m.revoked_at is null
     and m.role in ('reviewer','administrator')
  )
 );
drop policy if exists nfq_variant_curation_events_read_authorized on public.nfq_variant_curation_events;
create policy nfq_variant_curation_events_read_authorized on public.nfq_variant_curation_events
 for select to authenticated using (
  actor_id=(select auth.uid())
  or exists (
   select 1 from public.nfq_research_memberships m
   where m.user_id=(select auth.uid()) and m.revoked_at is null
     and m.role in ('reviewer','administrator')
  )
 );
-- No direct INSERT/UPDATE/DELETE grants on either curation table or public.variants.

create or replace function public.nfq_submit_variant_curation(
 p_variant_id bigint,p_field_name text,p_proposed_value text,
 p_rationale text,p_source_reference text
) returns bigint language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (select auth.uid());
 previous_value text;
 next_value text := btrim(p_proposed_value);
 proposal_id bigint;
 record public.variants%rowtype;
begin
 if actor is null or not exists (
  select 1 from public.nfq_research_memberships m
  where m.user_id=actor and m.revoked_at is null
    and m.role in ('contributor','reviewer','administrator')
 ) then raise exception 'FQ research membership required' using errcode='42501'; end if;
 if p_variant_id is null or p_variant_id<=0 or
    p_field_name is null or p_field_name not in ('legacy_name','protein_name','cdna_name','alt_names') or
    p_proposed_value is null or length(next_value) not between 2 and 500 or
    p_rationale is null or length(btrim(p_rationale)) not between 20 and 900 or
    p_source_reference is null or length(btrim(p_source_reference)) not between 8 and 250 or
    next_value ~ '[[:cntrl:]]' or btrim(p_rationale) ~ '[[:cntrl:]]' or
    btrim(p_source_reference) ~ '[[:cntrl:]]'
 then raise exception 'Invalid variant correction' using errcode='22023'; end if;
 select * into record from public.variants where id=p_variant_id for share;
 if not found then raise exception 'Variant not found' using errcode='22023'; end if;
 previous_value := case p_field_name
  when 'legacy_name' then record.legacy_name
  when 'protein_name' then record.protein_name
  when 'cdna_name' then record.cdna_name
  when 'alt_names' then record.alt_names
 end;
 if previous_value is not distinct from next_value then
  raise exception 'No recorded change' using errcode='22023';
 end if;
 insert into public.nfq_variant_curation_proposals
 (variant_id,field_name,recorded_value,proposed_value,rationale,source_reference,submitted_by)
 values(p_variant_id,p_field_name,previous_value,next_value,btrim(p_rationale),btrim(p_source_reference),actor)
 returning id into proposal_id;
 insert into public.nfq_variant_curation_events
 (proposal_id,variant_id,event_type,field_name,before_value,after_value,actor_id)
 values(proposal_id,p_variant_id,'submitted',p_field_name,previous_value,null,actor);
 return proposal_id;
end;$$;

create or replace function public.nfq_decide_variant_curation(
 p_proposal_id bigint,p_decision text,p_review_note text
) returns void language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (select auth.uid());
 proposal public.nfq_variant_curation_proposals%rowtype;
 record public.variants%rowtype;
 latest_value text;
begin
 if actor is null or not exists (
  select 1 from public.nfq_research_memberships m
  where m.user_id=actor and m.revoked_at is null
    and m.role in ('reviewer','administrator')
 ) then raise exception 'Independent scientific reviewer required' using errcode='42501'; end if;
 if p_proposal_id is null or p_proposal_id<=0 or p_decision is null or
  p_decision not in ('approved','rejected') or p_review_note is null
  or length(btrim(p_review_note)) not between 15 and 900 or
  btrim(p_review_note) ~ '[[:cntrl:]]'
 then raise exception 'Invalid variant review decision' using errcode='22023'; end if;
 select * into proposal from public.nfq_variant_curation_proposals
  where id=p_proposal_id for update;
 if not found or proposal.status<>'submitted' then
  raise exception 'Proposal unavailable or already decided' using errcode='22023'; end if;
 if proposal.submitted_by=actor then
  raise exception 'Reviewer must be different from submitter' using errcode='42501'; end if;
 select * into record from public.variants where id=proposal.variant_id for update;
 if not found then raise exception 'Variant unavailable' using errcode='22023'; end if;
 latest_value := case proposal.field_name
  when 'legacy_name' then record.legacy_name
  when 'protein_name' then record.protein_name
  when 'cdna_name' then record.cdna_name
  when 'alt_names' then record.alt_names
 end;
 if latest_value is distinct from proposal.recorded_value then
  raise exception 'Variant changed since proposal; re-review required' using errcode='40001'; end if;
 if p_decision='approved' then
  update public.variants set
   legacy_name=case when proposal.field_name='legacy_name' then proposal.proposed_value else legacy_name end,
   protein_name=case when proposal.field_name='protein_name' then proposal.proposed_value else protein_name end,
   cdna_name=case when proposal.field_name='cdna_name' then proposal.proposed_value else cdna_name end,
   alt_names=case when proposal.field_name='alt_names' then proposal.proposed_value else alt_names end,
   updated_at=now()
  where id=proposal.variant_id;
 end if;
 update public.nfq_variant_curation_proposals set
  status=p_decision,reviewed_by=actor,reviewed_at=now(),review_note=btrim(p_review_note)
 where id=proposal.id;
 insert into public.nfq_variant_curation_events
 (proposal_id,variant_id,event_type,field_name,before_value,after_value,actor_id)
 values(proposal.id,proposal.variant_id,p_decision,proposal.field_name,
  latest_value,case when p_decision='approved' then proposal.proposed_value else latest_value end,actor);
end;$$;
revoke all on function public.nfq_submit_variant_curation(bigint,text,text,text,text) from public,anon,authenticated;
revoke all on function public.nfq_decide_variant_curation(bigint,text,text) from public,anon,authenticated;
grant execute on function public.nfq_submit_variant_curation(bigint,text,text,text,text) to authenticated;
grant execute on function public.nfq_decide_variant_curation(bigint,text,text) to authenticated;
comment on function public.nfq_decide_variant_curation(bigint,text,text) is
'Independent FQ reviewer decision; approved nomenclature updates and append-only before/after audit are atomic. Not therapy or clinical validation.';
