-- FQ-only designation. A signed-in account without a professional record
-- is not automatically a guest: explicit verification is required.
create table if not exists public.nfq_guest_designations (
 user_id uuid primary key references auth.users(id) on delete restrict,
 status text not null default 'active' check(status in ('active','revoked')),
 designated_by uuid not null references auth.users(id) on delete restrict,
 designated_at timestamptz not null default now(),
 reason text not null check(length(btrim(reason)) between 8 and 160)
);
comment on table public.nfq_guest_designations is
'Explicit verified FQ external guest affiliation; independent of research roles, neumDESK and authentication.';
alter table public.nfq_guest_designations enable row level security;
revoke all on public.nfq_guest_designations from public,anon,authenticated;
grant select on public.nfq_guest_designations to authenticated;
drop policy if exists nfq_guest_designation_self_read on public.nfq_guest_designations;
create policy nfq_guest_designation_self_read
 on public.nfq_guest_designations
 for select to authenticated
 using (user_id=(select auth.uid()) and status='active');
