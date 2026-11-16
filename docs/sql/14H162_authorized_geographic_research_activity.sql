-- NFQ 14H162: authorization-gated, historical *search* activity.
-- Source: CFTR research search_logs. Never exposes raw IP, GPS, session ID,
-- clinician identity, institution, query text, coordinate, or a singleton cell.
-- This RPC deliberately does not modify existing table grants or RLS rules.
CREATE OR REPLACE FUNCTION public.nfq_geographic_research_activity(
 p_variant_id bigint DEFAULT NULL
)
RETURNS TABLE (
 region_code text,
 search_events bigint,
 distinct_sessions bigint,
 first_observed_at timestamptz,
 last_observed_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
 IF auth.uid() IS NULL
    OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
    OR COALESCE(auth.jwt()->>'is_anonymous','false') = 'true'
 THEN
  RAISE EXCEPTION 'Verified research membership required' USING ERRCODE = '42501';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m
  WHERE m.user_id = auth.uid()
    AND m.revoked_at IS NULL
    AND m.role IN ('administrator','reviewer','contributor')
 ) THEN
  RAISE EXCEPTION 'Verified research membership required' USING ERRCODE = '42501';
 END IF;
 IF p_variant_id IS NOT NULL AND p_variant_id < 1 THEN
  RAISE EXCEPTION 'Invalid variant identifier' USING ERRCODE = '22023';
 END IF;

 RETURN QUERY
 SELECT
  r.code,
  count(*)::bigint,
  count(DISTINCT NULLIF(pg_catalog.btrim(l.session_id),''))::bigint,
  min(l.searched_at),
  max(l.searched_at)
 FROM (VALUES
  ('Andalusia','01'),('Andalucía','01'),('Aragon','02'),('Aragón','02'),
  ('Principality of Asturias','03'),('Asturias','03'),
  ('Balearic Islands','04'),('Illes Balears','04'),
  ('Canary Islands','05'),('Canarias','05'),
  ('Cantabria','06'),('Castile and León','07'),('Castilla y León','07'),
  ('Castilla-La Mancha','08'),('Castile-La Mancha','08'),
  ('Catalonia','09'),('Cataluña','09'),
  ('Valencian Community','10'),('Comunitat Valenciana','10'),
  ('Extremadura','11'),('Galicia','12'),('Madrid','13'),('Comunidad de Madrid','13'),
  ('Region of Murcia','14'),('Región de Murcia','14'),
  ('Navarre','15'),('Comunidad Foral de Navarra','15'),
  ('Basque Country','16'),('País Vasco','16'),
  ('La Rioja','17'),('Ceuta','18'),('Melilla','19')
 ) AS r(source_region,code)
 JOIN public.search_logs l ON l.region = r.source_region
 WHERE l.country = 'Spain'
   -- Unverified free-form GPS/browser locations are intentionally excluded.
   AND l.ip_source = 'ipapi.co'
   AND l.is_hit IS TRUE
   AND l.matched_variant_id IS NOT NULL
   AND (p_variant_id IS NULL OR l.matched_variant_id = p_variant_id)
   AND l.searched_at IS NOT NULL
 GROUP BY r.code
 -- Suppress low-activity cells; threshold applies independently to each
 -- requested variant. Do NOT add user-controlled time or institution filters.
 HAVING count(*) >= 20
    AND count(DISTINCT NULLIF(pg_catalog.btrim(l.session_id),'')) >= 10
 ORDER BY count(*) DESC,r.code
 LIMIT 19;
END;
$function$;

-- A SECURITY DEFINER RPC in public is callable by everyone by default:
-- revoke inherited defaults and grant only authenticated. The body ALSO
-- checks a live, unrevoked, server-recorded researcher membership.
REVOKE ALL ON FUNCTION public.nfq_geographic_research_activity(bigint)
 FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.nfq_geographic_research_activity(bigint)
 TO authenticated;
COMMENT ON FUNCTION public.nfq_geographic_research_activity(bigint)
 IS 'Verified research members only: k-suppressed historical IP-estimated search hit aggregates by Spain autonomous community. Not patients, prevalence, frequency, institutional metrics, or demand. No raw personal/location fields exposed.';
