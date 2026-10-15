
-- Phase 4B security foundation. Additive role model; no admin bootstrapped automatically.
-- No mutation of existing variant/evidence rows. No public scientific write grants.
CREATE TABLE IF NOT EXISTS public.nfq_research_memberships (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('contributor','reviewer','administrator')),
 granted_at timestamptz NOT NULL DEFAULT now(),
 granted_by uuid REFERENCES auth.users(id),
 revoked_at timestamptz
);
ALTER TABLE public.nfq_research_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfq_research_memberships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.nfq_research_memberships TO authenticated;
DROP POLICY IF EXISTS "nfq_membership_read_self" ON public.nfq_research_memberships;
CREATE POLICY "nfq_membership_read_self" ON public.nfq_research_memberships
 FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TABLE IF NOT EXISTS public.nfq_membership_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 actor_id uuid REFERENCES auth.users(id),
 target_id uuid NOT NULL,
 previous_role text,
 new_role text,
 action text NOT NULL CHECK (action IN ('grant','change','revoke')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nfq_membership_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nfq_membership_audit FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.nfq_membership_audit_id_seq FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.nfq_admin_set_member_role(
 target_user_id uuid, new_role text, revoke_access boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE
 actor_id uuid := (SELECT auth.uid());
 previous_role text;
BEGIN
 IF actor_id IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m
  WHERE m.user_id = actor_id AND m.role = 'administrator' AND m.revoked_at IS NULL
 ) THEN
  RAISE EXCEPTION 'Administrator role required' USING ERRCODE = '42501';
 END IF;
 IF target_user_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = target_user_id) THEN
  RAISE EXCEPTION 'Target account not found' USING ERRCODE = '22023';
 END IF;
 IF new_role NOT IN ('contributor','reviewer','administrator') OR new_role IS NULL THEN
  RAISE EXCEPTION 'Invalid research role' USING ERRCODE = '22023';
 END IF;
 IF target_user_id = actor_id AND (revoke_access OR new_role <> 'administrator') THEN
  RAISE EXCEPTION 'Administrators cannot remove their own role with this operation' USING ERRCODE='42501';
 END IF;
 SELECT m.role INTO previous_role FROM public.nfq_research_memberships m
 WHERE m.user_id=target_user_id FOR UPDATE;
 INSERT INTO public.nfq_research_memberships (user_id,role,granted_by,revoked_at)
 VALUES (target_user_id,new_role,actor_id,CASE WHEN revoke_access THEN now() ELSE NULL END)
 ON CONFLICT (user_id) DO UPDATE SET role=EXCLUDED.role,
  granted_at=now(),granted_by=EXCLUDED.granted_by,revoked_at=EXCLUDED.revoked_at;
 INSERT INTO public.nfq_membership_audit (actor_id,target_id,previous_role,new_role,action)
 VALUES (actor_id,target_user_id,previous_role,new_role,
  CASE WHEN revoke_access THEN 'revoke' WHEN previous_role IS NULL THEN 'grant' ELSE 'change' END);
END;
$fn$;
REVOKE ALL ON FUNCTION public.nfq_admin_set_member_role(uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nfq_admin_set_member_role(uuid,text,boolean) TO authenticated;

-- Retire legacy shared-PIN endpoints. They are not individual user authentication.
REVOKE ALL ON FUNCTION public.check_write_pin(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_write_pin(text) FROM PUBLIC,anon,authenticated;

COMMENT ON TABLE public.nfq_research_memberships IS 'Verified individual Supabase Auth roles; grants only via privileged administrator RPC or audited owner bootstrap.';
COMMENT ON FUNCTION public.nfq_admin_set_member_role(uuid,text,boolean) IS 'Only an already assigned administrator may assign or revoke research roles; no initial bootstrap and no password handling.';
