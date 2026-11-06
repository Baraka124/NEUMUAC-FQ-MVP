-- 14H116: administrator-only, read-only account directory.
-- Does not grant roles, create users, invite staff, or reveal credential metadata.
CREATE OR REPLACE FUNCTION public.nfq_admin_list_research_accounts(
  p_search text DEFAULT '',
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  user_id uuid,
  account_email text,
  account_created_at timestamptz,
  email_confirmed boolean,
  research_role text,
  role_revoked_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor_id uuid := (SELECT auth.uid());
  term text := left(btrim(coalesce(p_search,'')),120);
  row_limit integer := least(greatest(coalesce(p_limit,50),1),100);
BEGIN
  IF actor_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.nfq_research_memberships m
    WHERE m.user_id=actor_id AND m.role='administrator' AND m.revoked_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Administrator role required' USING ERRCODE='42501';
  END IF;
  RETURN QUERY
  SELECT u.id, u.email::text, u.created_at, (u.email_confirmed_at IS NOT NULL),
         CASE WHEN m.revoked_at IS NULL THEN m.role ELSE NULL END,
         m.revoked_at
  FROM auth.users u
  LEFT JOIN public.nfq_research_memberships m ON m.user_id=u.id
  WHERE term='' OR position(lower(term) in lower(coalesce(u.email,''))) > 0
  ORDER BY u.created_at DESC,u.id
  LIMIT row_limit;
END;
$function$;
REVOKE ALL ON FUNCTION public.nfq_admin_list_research_accounts(text,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nfq_admin_list_research_accounts(text,integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.nfq_admin_list_research_accounts(text,integer) TO authenticated;
COMMENT ON FUNCTION public.nfq_admin_list_research_accounts(text,integer) IS
'Admin-only registered research accounts; no professional-affiliation inference or credentials. Requires an active server-verified FQ administrator membership.';
