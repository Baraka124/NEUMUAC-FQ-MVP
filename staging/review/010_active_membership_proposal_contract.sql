\set ON_ERROR_STOP on
-- Reuse the complete 14H105 contract, including two real proposals and a review.
\ir 009_source_correction_contract.sql

-- Match the production membership access requirements in disposable PostgreSQL.
ALTER TABLE public.nfq_research_memberships ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.nfq_research_memberships TO authenticated;
CREATE POLICY nfq_membership_read_self ON public.nfq_research_memberships
 FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
\ir ../../supabase/proposed/14h111_active_membership_proposal_read.sql

-- The creator retains visibility while assigned, but not after revocation.
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $check$ BEGIN
 IF (SELECT count(*) FROM public.nfq_source_correction_proposals)<>1 THEN
  RAISE EXCEPTION 'Active contributor cannot see their proposal'; END IF;
END $check$;
RESET ROLE;
UPDATE public.nfq_research_memberships SET revoked_at=now()
 WHERE user_id='11111111-1111-4111-8111-111111111111';
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $check$ BEGIN
 IF (SELECT count(*) FROM public.nfq_source_correction_proposals)<>0 THEN
  RAISE EXCEPTION 'Revoked creator can still read private proposals'; END IF;
 BEGIN
  PERFORM public.nfq_submit_source_correction(20,'title','Unapproved replacement','Revoked contributors must not submit another proposal.');
  RAISE EXCEPTION 'Revoked creator could submit a correction';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $check$;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
DO $check$ BEGIN
 IF (SELECT count(*) FROM public.nfq_source_correction_proposals)<>0 THEN
  RAISE EXCEPTION 'Unassigned user can read private proposals'; END IF;
END $check$;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $check$ BEGIN
 IF (SELECT count(*) FROM public.nfq_source_correction_proposals)<>2 THEN
  RAISE EXCEPTION 'Active scientific reviewer lost queue visibility'; END IF;
 BEGIN
  PERFORM * FROM public.nfq_source_correction_events;
  RAISE EXCEPTION 'Private audit ledger was exposed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $check$;
RESET ROLE;
DO $check$ BEGIN
 IF (SELECT title FROM public.evidence_links WHERE id=20)<>'Original recorded citation'
  OR (SELECT count(*) FROM public.nfq_source_correction_events)<>3 THEN
  RAISE EXCEPTION 'Scientific source or review audit was altered'; END IF;
END $check$;
SELECT '14H111 revoke-aware RLS PASS' AS result;
