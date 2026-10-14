-- Phase 2M-N, STAGING ONLY.
-- This script is not applied to the production Supabase database by CI.
-- Safe additive table; no automatic role grants or privileged API paths.
BEGIN;
CREATE TABLE public.nfq_research_memberships (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('contributor','reviewer','administrator')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
ALTER TABLE public.nfq_research_memberships ENABLE ROW LEVEL SECURITY;
-- No browser may write an assignment, including to themselves.
REVOKE ALL ON TABLE public.nfq_research_memberships FROM PUBLIC,anon,authenticated;
-- A signed-in account may only fetch its own role label and lifecycle metadata.
-- user_id and granted_by are deliberately NOT browser-readable.
GRANT SELECT (role,granted_at,revoked_at) ON public.nfq_research_memberships TO authenticated;
-- This privileged role is for trusted server-side provisioning only. Never in Vue.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.nfq_research_memberships TO service_role;
CREATE POLICY nfq_membership_self_read ON public.nfq_research_memberships
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IS NOT NULL AND user_id = (SELECT auth.uid()));
DO $verify$
BEGIN
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.nfq_research_memberships'::regclass)
    THEN RAISE EXCEPTION 'Research memberships RLS not enabled'; END IF;
  IF has_table_privilege('anon','public.nfq_research_memberships','SELECT')
    OR has_table_privilege('authenticated','public.nfq_research_memberships','INSERT')
    OR has_table_privilege('authenticated','public.nfq_research_memberships','UPDATE')
    OR has_table_privilege('authenticated','public.nfq_research_memberships','DELETE')
    OR has_table_privilege('authenticated','public.nfq_research_memberships','TRUNCATE')
    OR has_column_privilege('authenticated','public.nfq_research_memberships','granted_by','SELECT')
    OR has_column_privilege('authenticated','public.nfq_research_memberships','user_id','SELECT')
    THEN RAISE EXCEPTION 'Research membership browser privileges too broad'; END IF;
END $verify$;
COMMIT;
