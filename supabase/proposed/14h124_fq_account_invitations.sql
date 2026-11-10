-- Phase 14H124 candidate: server-controlled FQ invitation dispatch audit.
-- NOT deployed. No access for browser roles. No invitation, research role or
-- professional link is created by applying this schema.
create table if not exists public.nfq_account_invitations(
 id uuid primary key default gen_random_uuid(),
 recipient_email text not null
   check(length(recipient_email) between 6 and 254
         and recipient_email=lower(btrim(recipient_email))
         and position('@' in recipient_email)>1),
 intended_kind text not null check(intended_kind in ('clinician','guest')),
 requested_by uuid not null references auth.users(id) on delete restrict,
 requested_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 status text not null default 'dispatching'
  check(status in ('dispatching','sent','failed','uncertain')),
 invited_user_id uuid references auth.users(id) on delete restrict
);
-- An invitation cannot be issued twice while delivery is pending,
-- completed or uncertain. Resending requires a separately audited action.
create unique index if not exists nfq_invitations_single_active_recipient
 on public.nfq_account_invitations(lower(recipient_email))
 where status in ('dispatching','sent','uncertain');
create index if not exists nfq_invitations_actor_window
 on public.nfq_account_invitations(requested_by,requested_at desc);
create index if not exists nfq_invitations_email_window
 on public.nfq_account_invitations(recipient_email,requested_at desc);
alter table public.nfq_account_invitations enable row level security;
revoke all on public.nfq_account_invitations from public,anon,authenticated;
-- Only a verified Administrator Edge Function using a server-side secret
-- can reserve/update invitation delivery records. Audit is retained.
