-- 14H169: on-demand, content-addressed export of independently reviewed
-- CFTR source observations.  No writes, no patient data, no model predictions.
-- This snapshot is not a registered/validated statistical training dataset.
BEGIN;
CREATE OR REPLACE FUNCTION public.nfq_approved_research_dataset()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_actor uuid := auth.uid();
 v_total integer;
 v_bad integer;
 v_records jsonb;
 v_fingerprint text;
BEGIN
 IF v_actor IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
  OR auth.jwt()->>'session_id' IS NULL OR NOT EXISTS (
   SELECT 1 FROM auth.sessions s
   WHERE s.id::text=auth.jwt()->>'session_id' AND s.user_id=v_actor
  ) OR NOT EXISTS (
   SELECT 1 FROM public.nfq_research_memberships m
   WHERE m.user_id=v_actor AND m.revoked_at IS NULL
     AND m.role IN ('contributor','reviewer','administrator')
  )
 THEN RAISE EXCEPTION 'Current scientific research membership required' USING ERRCODE='42501';
 END IF;

 -- Do not silently discard a mislabeled "approved" claim or one whose
 -- original reference, two independent approvals, or endpoint is invalid.
 SELECT count(*) INTO v_total FROM nfq_evidence_review.claims c
 WHERE c.status='approved';
 IF v_total>1000 THEN
  RAISE EXCEPTION 'Approved evidence exceeds supported complete dataset' USING ERRCODE='54000';
 END IF;
 SELECT count(*) INTO v_bad
 FROM nfq_evidence_review.claims c
 WHERE c.status='approved' AND (
  NOT EXISTS(SELECT 1 FROM public.evidence_links e
   WHERE e.id=c.reference_id AND e.variant_id=c.variant_id)
  OR (SELECT count(DISTINCT r.reviewer_id)
      FROM nfq_evidence_review.reviews r
      WHERE r.claim_id=c.id AND r.decision='approve'
       AND r.reviewer_id<>c.submitted_by)<>2
  OR EXISTS(SELECT 1 FROM nfq_evidence_review.reviews r
      WHERE r.claim_id=c.id AND r.decision='reject')
  OR (c.endpoint IS NOT NULL AND
    NOT nfq_evidence_review.endpoint_spec_valid(c.endpoint))
 );
 IF v_bad<>0 THEN
  RAISE EXCEPTION 'Approved source snapshot has incomplete provenance' USING ERRCODE='22023';
 END IF;

 -- The snapshot is assembled transactionally from the current approved,
 -- non-superseded series revisions. Reviewer identities and free-form notes
 -- are never returned. The source URL is catalogue metadata, not validation.
 SELECT COALESCE(jsonb_agg(
  jsonb_build_object(
   'claimId',c.id::text,
   'seriesId',c.series_id::text,
   'revision',c.revision,
   'variantId',c.variant_id::text,
   'referenceId',e.id,
   'referenceTitle',e.title,
   'referenceUrl',e.url,
   'referencePmid',e.pmid,
   'referenceDoi',e.doi,
   'therapy',c.therapy,
   'studyFamilyId',c.study_family_id,
   'scope',c.scope,
   'genotypePair',CASE WHEN c.scope='genotype-specific'
     THEN jsonb_build_array(c.genotype_a::text,c.genotype_b::text)
     ELSE 'null'::jsonb END,
   'method',c.method,
   'finding',c.finding,
   'locator',c.locator,
   'endpoint',c.endpoint,
   'reviewCount',2,
   'reviewedAt',(
     SELECT max(r.reviewed_at) FROM nfq_evidence_review.reviews r
     WHERE r.claim_id=c.id AND r.decision='approve'
   )
  )
  ORDER BY c.variant_id,c.therapy,c.study_family_id,c.id
 ),'[]'::jsonb) INTO v_records
 FROM nfq_evidence_review.claims c
 JOIN public.evidence_links e
   ON e.id=c.reference_id AND e.variant_id=c.variant_id
 WHERE c.status='approved';

 IF jsonb_array_length(v_records)<>v_total THEN
  RAISE EXCEPTION 'Incomplete approved study export' USING ERRCODE='22023';
 END IF;

 -- A content digest is reproducible for an unchanged ordered record set.
 -- This is provenance versioning, not a signature and not scientific validation.
 v_fingerprint:=pg_catalog.encode(
  pg_catalog.sha256(pg_catalog.convert_to(v_records::text,'UTF8')),'hex');
 RETURN jsonb_build_object(
  'source','nfq-approved-research-dataset-v1',
  'schemaVersion',1,
  'snapshotSha256',v_fingerprint,
  'generatedAt',now(),
  'total',v_total,
  'records',v_records,
  'limitations',jsonb_build_array(
   'Research-only source-level metadata',
   'No patient genotypes, individual outcomes or source sample size verified',
   'No automatic effect estimation, cross-study pooling or response prediction'
  )
 );
END;
$fn$;
REVOKE ALL ON FUNCTION public.nfq_approved_research_dataset()
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nfq_approved_research_dataset() TO authenticated;
COMMENT ON FUNCTION public.nfq_approved_research_dataset() IS
 'Read-only, content-hashed, complete twice-independent-reviewed CFTR source observation dataset. Caller must possess a live authenticated session and current research membership. Not a clinical prediction dataset.';
COMMIT;
