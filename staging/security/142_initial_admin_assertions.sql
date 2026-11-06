\set ON_ERROR_STOP on
DO $verify$ BEGIN
 IF (SELECT count(*) FROM public.nfq_research_memberships)<>1
 OR (SELECT count(*) FROM public.nfq_research_memberships WHERE user_id='11111111-1111-4111-8111-111111111111'
  AND role='administrator' AND granted_by IS NULL AND revoked_at IS NULL)<>1
 OR (SELECT count(*) FROM public.nfq_membership_audit WHERE
  target_id='11111111-1111-4111-8111-111111111111' AND actor_id IS NULL
  AND previous_role IS NULL AND new_role='administrator' AND action='grant')<>1
 OR (SELECT count(*) FROM public.nfq_membership_audit)<>1 THEN
  RAISE EXCEPTION 'Bootstrap did not produce exactly one verified admin and audit event';
 END IF;
END $verify$;
