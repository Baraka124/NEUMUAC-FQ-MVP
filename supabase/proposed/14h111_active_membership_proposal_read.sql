-- Require an active membership to view a submitted correction.
-- This is a proposal for review, not a production migration.
BEGIN;
DROP POLICY IF EXISTS nfq_source_proposal_read_own_or_reviewer ON public.nfq_source_correction_proposals;
CREATE POLICY nfq_source_proposal_read_own_or_reviewer ON public.nfq_source_correction_proposals
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.nfq_research_memberships AS member
    WHERE member.user_id = (SELECT auth.uid())
      AND member.revoked_at IS NULL
      AND (member.user_id = created_by OR member.role IN ('reviewer','administrator'))
  )
);
COMMIT;
