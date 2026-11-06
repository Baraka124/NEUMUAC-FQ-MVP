\set ON_ERROR_STOP on
-- 14H110: MANUAL, PRIVILEGED, ONE-TIME BOOTSTRAP ONLY.
-- Never place this script in a public HTTP endpoint, browser bundle or automatic migration.
-- Supply verified_account_uuid and change_ticket as psql variables AFTER independently
-- proving the signed-in account is the intended platform administrator.
-- Example invocation: psql ... -v verified_account_uuid=<verified-uuid> -v change_ticket=<approved-ticket> -f ...
-- Not authorized merely because Auth lists only one user.
\if :{?verified_account_uuid}
\else
\echo 'BLOCKED: verified_account_uuid must be supplied from an independently confirmed account.'
SELECT 1/0; -- ON_ERROR_STOP causes a non-zero exit and no changes
\endif
\if :{?change_ticket}
\else
\echo 'BLOCKED: an approved change_ticket is required.'
SELECT 1/0; -- ON_ERROR_STOP causes a non-zero exit and no changes
\endif

BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE public.nfq_research_memberships IN EXCLUSIVE MODE;
LOCK TABLE public.nfq_membership_audit IN EXCLUSIVE MODE;
SELECT set_config('nfq.bootstrap.verified_account', :'verified_account_uuid', true);
SELECT set_config('nfq.bootstrap.change_ticket', :'change_ticket', true);

DO $bootstrap$
DECLARE
  account_id uuid := current_setting('nfq.bootstrap.verified_account')::uuid;
  ticket text := current_setting('nfq.bootstrap.change_ticket');
BEGIN
 IF current_user NOT IN ('postgres','supabase_admin') THEN
  RAISE EXCEPTION 'Privileged database operator required' USING ERRCODE='42501';
 END IF;
 IF length(btrim(ticket)) < 8 OR length(ticket) > 120 THEN
  RAISE EXCEPTION 'Approved external change ticket must be 8–120 characters';
 END IF;
 IF (SELECT count(*) FROM public.nfq_research_memberships)<>0 THEN
  RAISE EXCEPTION 'Bootstrap forbidden: role assignments already exist';
 END IF;
 IF (SELECT count(*) FROM public.nfq_membership_audit)<>0 THEN
  RAISE EXCEPTION 'Bootstrap forbidden: membership audit already contains events';
 END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=account_id) THEN
  RAISE EXCEPTION 'Verified account UUID does not exist';
 END IF;
 -- NULL granted_by and actor_id distinguish privileged first bootstrap
 -- from normal administrator-to-administrator role changes.
 INSERT INTO public.nfq_research_memberships(user_id,role,granted_by)
 VALUES(account_id,'administrator',NULL);
 INSERT INTO public.nfq_membership_audit(actor_id,target_id,previous_role,new_role,action)
 VALUES(NULL,account_id,NULL,'administrator','grant');
 IF (SELECT count(*) FROM public.nfq_research_memberships
     WHERE user_id=account_id AND role='administrator' AND revoked_at IS NULL)<>1
    OR (SELECT count(*) FROM public.nfq_membership_audit
     WHERE target_id=account_id AND actor_id IS NULL AND action='grant')<>1
 THEN RAISE EXCEPTION 'Bootstrap invariant failed';
 END IF;
 RAISE NOTICE 'First administrator recorded under approved external change ticket %. No scientific data was changed.',ticket;
END $bootstrap$;
COMMIT;
