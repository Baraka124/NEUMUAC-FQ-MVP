-- 14H129 FQ-only explicit Guest designation governance.
-- Applying this migration creates no new Guest access and changes no current role.
create table if not exists public.nfq_guest_designation_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id) on delete restrict,
 target_id uuid not null references auth.users(id) on delete restrict,
 action text not null check (action in ('grant','revoke')),
 reason text not null check(length(btrim(reason)) between 8 and 160),
 created_at timestamptz not null default now()
);
create index if not exists nfq_guest_designation_events_target_time
 on public.nfq_guest_designation_events(target_id,created_at desc);
alter table public.nfq_guest_designation_events enable row level security;
revoke all on public.nfq_guest_designation_events from public,anon,authenticated;

create or replace function public.nfq_admin_get_guest_access(p_user_id uuid)
returns table(is_active boolean, designation_reason text, designated_at timestamptz)
language plpgsql security definer set search_path to ''
as $function$
declare actor_id uuid := (select auth.uid());
begin
 if actor_id is null or not exists(
  select 1 from public.nfq_research_memberships m
  where m.user_id=actor_id and m.role='administrator' and m.revoked_at is null
 ) then
  raise exception 'Administrator role required' using errcode='42501';
 end if;
 if p_user_id is null or not exists(select 1 from auth.users u where u.id=p_user_id) then
  raise exception 'Target account not found' using errcode='22023';
 end if;
 return query select coalesce(g.status='active',false),
  case when g.status='active' then g.reason else null end,
  g.designated_at
 from (select 1) seed
 left join public.nfq_guest_designations g on g.user_id=p_user_id;
end;
$function$;
revoke all on function public.nfq_admin_get_guest_access(uuid) from public,anon,authenticated;
grant execute on function public.nfq_admin_get_guest_access(uuid) to authenticated;

create or replace function public.nfq_admin_set_guest_access(
 p_user_id uuid,p_action text,p_reason text
) returns void
language plpgsql security definer set search_path to ''
as $function$
declare
 actor_id uuid := (select auth.uid());
 target_id uuid;
 existing_status text;
 note text := btrim(coalesce(p_reason,''));
begin
 if actor_id is null or not exists (
  select 1 from public.nfq_research_memberships m
  where m.user_id=actor_id and m.role='administrator' and m.revoked_at is null
 ) then
  raise exception 'Administrator role required' using errcode='42501';
 end if;
 if p_action is null or p_action not in ('grant','revoke') then
  raise exception 'Invalid designation action' using errcode='22023';
 end if;
 if length(note) not between 8 and 160 then
  raise exception 'Reason must contain between 8 and 160 characters' using errcode='22023';
 end if;
 if p_user_id is null or p_user_id=actor_id then
  raise exception 'Administrators cannot designate themselves as Guests' using errcode='42501';
 end if;
 -- Both guest/role mutations lock the same auth user first, preventing dual-role races.
 select u.id into target_id from auth.users u where u.id=p_user_id for update;
 if target_id is null then
  raise exception 'Target account not found' using errcode='22023';
 end if;
 select g.status into existing_status from public.nfq_guest_designations g
  where g.user_id=p_user_id for update;
 if p_action='grant' then
  if not exists(select 1 from auth.users u where u.id=p_user_id and u.email_confirmed_at is not null) then
   raise exception 'Verified email is required before Guest designation' using errcode='22023';
  end if;
  if exists (
   select 1 from public.nfq_research_memberships m
   where m.user_id=p_user_id and m.revoked_at is null
  ) then
   raise exception 'Revoke research membership before designating Guest' using errcode='42501';
  end if;
  if existing_status='active' then
   raise exception 'Guest designation is already active' using errcode='23505';
  end if;
  insert into public.nfq_guest_designations(user_id,status,designated_by,designated_at,reason)
  values(p_user_id,'active',actor_id,now(),note)
  on conflict(user_id) do update set status='active',
   designated_by=excluded.designated_by,
   designated_at=excluded.designated_at,
   reason=excluded.reason;
 else
  if existing_status is distinct from 'active' then
   raise exception 'There is no active Guest designation to revoke' using errcode='22023';
  end if;
  update public.nfq_guest_designations
   set status='revoked',designated_by=actor_id,designated_at=now(),reason=note
   where user_id=p_user_id;
 end if;
 insert into public.nfq_guest_designation_events(actor_id,target_id,action,reason)
 values(actor_id,p_user_id,p_action,note);
end;
$function$;
revoke all on function public.nfq_admin_set_guest_access(uuid,text,text) from public,anon,authenticated;
grant execute on function public.nfq_admin_set_guest_access(uuid,text,text) to authenticated;

-- The existing member-role RPC must respect Guest exclusivity and activation.
-- This is an additive guard; its existing audit and self-revocation rules are preserved.
create or replace function public.nfq_admin_set_member_role(
 target_user_id uuid,new_role text,revoke_access boolean default false
) returns void
language plpgsql security definer set search_path to ''
as $function$
declare
 actor_id uuid := (select auth.uid());
 previous_role text;
 verified_target uuid;
begin
 if actor_id is null or not exists (
  select 1 from public.nfq_research_memberships m
  where m.user_id=actor_id and m.role='administrator' and m.revoked_at is null
 ) then
  raise exception 'Administrator role required' using errcode='42501';
 end if;
 if target_user_id is null then
  raise exception 'Target account not found' using errcode='22023';
 end if;
 -- Lock order matches Guest assignment to avoid concurrent contradictory grants.
 select u.id into verified_target from auth.users u
 where u.id=target_user_id for update;
 if verified_target is null then
  raise exception 'Target account not found' using errcode='22023';
 end if;
 if new_role is null or new_role not in ('contributor','reviewer','administrator') then
  raise exception 'Invalid research role' using errcode='22023';
 end if;
 if target_user_id=actor_id and (revoke_access or new_role<>'administrator') then
  raise exception 'Administrators cannot remove their own role with this operation' using errcode='42501';
 end if;
 if not revoke_access then
  if exists (
   select 1 from public.nfq_guest_designations g
   where g.user_id=target_user_id and g.status='active'
  ) then
   raise exception 'Revoke Guest designation before assigning research membership' using errcode='42501';
  end if;
  if not exists (
   select 1 from auth.users u where u.id=target_user_id and u.email_confirmed_at is not null
  ) then
   raise exception 'Verified email is required before research role assignment' using errcode='22023';
  end if;
 end if;
 select m.role into previous_role from public.nfq_research_memberships m
 where m.user_id=target_user_id for update;
 insert into public.nfq_research_memberships (user_id,role,granted_by,revoked_at)
 values (target_user_id,new_role,actor_id,case when revoke_access then now() else null end)
 on conflict(user_id) do update set role=excluded.role,
  granted_at=now(),granted_by=excluded.granted_by,revoked_at=excluded.revoked_at;
 insert into public.nfq_membership_audit
 (actor_id,target_id,previous_role,new_role,action)
 values (actor_id,target_user_id,previous_role,new_role,
  case when revoke_access then 'revoke' when previous_role is null then 'grant' else 'change' end);
end;
$function$;
revoke all on function public.nfq_admin_set_member_role(uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.nfq_admin_set_member_role(uuid,text,boolean) to authenticated;
