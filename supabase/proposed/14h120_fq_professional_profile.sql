-- FQ-only professional profile projection. Source: read-only inspected neumDESK staff.
-- This schema does NOT modify, join or query the neumDESK database.
-- A verified operator supplies snapshots only after checking both auth identities.
create table if not exists public.nfq_professional_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  desk_staff_id uuid not null unique,
  desk_user_id uuid not null unique,
  display_name text not null check (length(btrim(display_name)) between 2 and 160),
  staff_type text not null check (length(btrim(staff_type)) between 2 and 80),
  department text check (department is null or length(department) <= 160),
  research_group text check (research_group is null or length(research_group) <= 80),
  research_line text check (research_line is null or length(research_line) <= 160),
  link_status text not null default 'verified' check(link_status in ('verified','revoked')),
  link_method text not null check(link_method='operator_verified_cross_project'),
  source_verified_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  modified_at timestamptz not null default now()
);
comment on table public.nfq_professional_profiles is
'FQ-owned minimal professional profile snapshot verified against separate neumDESK records; not a live sync; not a research-role grant.';
alter table public.nfq_professional_profiles enable row level security;
revoke all on table public.nfq_professional_profiles from public,anon,authenticated;
grant select on table public.nfq_professional_profiles to authenticated;
drop policy if exists nfq_professional_profile_self_read on public.nfq_professional_profiles;
create policy nfq_professional_profile_self_read
 on public.nfq_professional_profiles
 for select to authenticated
 using (user_id=(select auth.uid()) and link_status='verified');
