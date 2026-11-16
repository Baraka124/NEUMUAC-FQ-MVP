-- 14H165: deliberately narrow, read-only research provenance for an exact
-- CFTR variant. No raw reviewer identities, full contradiction details,
-- patient records, notes, session/IP fields or source narrative.
-- Authenticated membership is checked within the SQL function; browser
-- membership state is only a convenience, never an authorization mechanism.
CREATE OR REPLACE FUNCTION public.nfq_research_therapy_source_snapshot(
 p_variant_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path=''
AS $function$
DECLARE
 out_archival jsonb;
 out_conflicts jsonb;
 out_validations jsonb;
BEGIN
 IF auth.uid() IS NULL
   OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
   OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
 THEN RAISE EXCEPTION 'Active researcher required' USING ERRCODE='42501';
 END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m
  WHERE m.user_id=auth.uid() AND m.revoked_at IS NULL
    AND m.role IN ('administrator','reviewer','contributor')
 ) THEN RAISE EXCEPTION 'Active researcher required' USING ERRCODE='42501';
 END IF;
 IF p_variant_id IS NULL OR p_variant_id<1 OR NOT EXISTS (
  SELECT 1 FROM public.variants v WHERE v.id=p_variant_id
 ) THEN RAISE EXCEPTION 'Unknown CFTR variant' USING ERRCODE='22023';
 END IF;
 IF (SELECT count(*) FROM public.variant_evidence e WHERE e.variant_id=p_variant_id)>200
   OR (SELECT count(*) FROM public.contradictions c WHERE c.variant_id=p_variant_id)>200
   OR (SELECT count(*) FROM public.validation_history h WHERE h.variant_id=p_variant_id)>200
 THEN RAISE EXCEPTION 'Research source exceeds complete-view limit' USING ERRCODE='54000';
 END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',e.id,
  'variant_id',e.variant_id::text,
  'source_id',e.source_id,
  'eti_response',e.eti_response,
  'alyftrek_response',e.alyftrek_response,
  'confidence',e.confidence,
  'created_at',e.created_at
 ) ORDER BY e.id DESC),'[]'::jsonb)
 INTO out_archival
 FROM public.variant_evidence e WHERE e.variant_id=p_variant_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',c.id,'variant_id',c.variant_id::text,'field',c.field,
  'severity',c.severity,'resolved',c.resolved,
  'detected_at',c.detected_at,'resolved_at',c.resolved_at
 ) ORDER BY c.id DESC),'[]'::jsonb)
 INTO out_conflicts
 FROM public.contradictions c WHERE c.variant_id=p_variant_id;
 SELECT COALESCE(jsonb_agg(jsonb_build_object(
  'id',h.id,'variant_id',h.variant_id::text,'action',h.action,
  'created_at',h.created_at,'confidence_level',h.confidence_level,
  'snapshot_cftr_class',h.snapshot_cftr_class
 ) ORDER BY h.id DESC),'[]'::jsonb)
 INTO out_validations
 FROM public.validation_history h WHERE h.variant_id=p_variant_id;
 RETURN jsonb_build_object(
  'variant_id',p_variant_id::text,
  'archival',out_archival,
  'conflicts',out_conflicts,
  'validations',out_validations,
  'kind','historical-records-only',
  'reviewed_source_claims','not-provided'
 );
END;
$function$;
REVOKE ALL ON FUNCTION public.nfq_research_therapy_source_snapshot(bigint)
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nfq_research_therapy_source_snapshot(bigint)
 TO authenticated;
COMMENT ON FUNCTION public.nfq_research_therapy_source_snapshot(bigint) IS
 'Research member only; exact variant historical flags and event metadata. No source observations are independently validated or reclassified.';
