-- 14H171. Add immutable source-reported sampling/uncertainty context.
-- Source claims and approved dataset keep their existing authorized RPCs.
-- Historical approved rows retain NULL; no automatic backfill or clinical effect calculation.
BEGIN;
CREATE OR REPLACE FUNCTION nfq_evidence_review.study_stats_valid(p jsonb,ep jsonb)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE SET search_path=''
AS $check$
DECLARE
 v_unit text; v_design text; v_kind text; v_target text; v_locator text;
 v_n numeric; v_comp numeric; v_err numeric; v_lower numeric; v_upper numeric;
 v_has_n boolean; v_any_reported boolean;
BEGIN
 IF p IS NULL OR jsonb_typeof(p)<>'object' OR
   (SELECT count(*) FROM jsonb_object_keys(p))<>10 OR
   EXISTS(SELECT 1 FROM jsonb_object_keys(p) k WHERE k NOT IN
    ('analysisUnit','design','interventionN','comparatorN',
     'uncertaintyType','uncertaintyValue','ciLower','ciUpper',
     'uncertaintyTarget','sourceLocator'))
 THEN RETURN false; END IF;
 v_unit:=p->>'analysisUnit'; v_design:=p->>'design';
 v_kind:=p->>'uncertaintyType'; v_target:=p->>'uncertaintyTarget';
 v_locator:=p->>'sourceLocator';
 IF v_unit IS NULL OR v_design IS NULL OR v_kind IS NULL OR v_target IS NULL OR
  v_unit NOT IN ('participants','donors','biological-replicates','technical-replicates','not-reported')
  OR v_design NOT IN ('parallel','paired','single-arm','not-reported')
  OR v_kind NOT IN ('sd','sem','ci95','not-reported')
  OR v_target NOT IN ('reported-outcome','intervention-arm','between-group-contrast','not-reported')
  OR v_locator IS NULL OR length(v_locator) NOT BETWEEN 1 AND 240
  OR v_locator<>btrim(v_locator) OR v_locator ~ '[[:cntrl:]]'
 THEN RETURN false; END IF;
 IF jsonb_typeof(p->'interventionN') NOT IN ('null','number') OR
  jsonb_typeof(p->'comparatorN') NOT IN ('null','number') OR
  jsonb_typeof(p->'uncertaintyValue') NOT IN ('null','number') OR
  jsonb_typeof(p->'ciLower') NOT IN ('null','number') OR
  jsonb_typeof(p->'ciUpper') NOT IN ('null','number')
 THEN RETURN false; END IF;
 IF jsonb_typeof(p->'interventionN')='number' THEN
  v_n:=(p->>'interventionN')::numeric;
  IF v_n<>trunc(v_n) OR v_n NOT BETWEEN 1 AND 1000000 THEN RETURN false; END IF;
 END IF;
 IF jsonb_typeof(p->'comparatorN')='number' THEN
  v_comp:=(p->>'comparatorN')::numeric;
  IF v_comp<>trunc(v_comp) OR v_comp NOT BETWEEN 1 AND 1000000 THEN RETURN false; END IF;
 END IF;
 v_has_n:=v_n IS NOT NULL OR v_comp IS NOT NULL;
 IF v_has_n AND v_unit='not-reported' OR
  v_design='single-arm' AND v_comp IS NOT NULL OR
  v_comp IS NOT NULL AND v_n IS NULL
 THEN RETURN false; END IF;
 v_any_reported:=v_has_n OR v_unit<>'not-reported' OR
   v_design<>'not-reported' OR v_kind<>'not-reported';
 IF v_any_reported AND (length(v_locator)<8 OR v_locator='not-reported') OR
   NOT v_any_reported AND v_locator<>'not-reported'
 THEN RETURN false; END IF;
 IF v_kind='not-reported' THEN
  RETURN v_target='not-reported' AND
   jsonb_typeof(p->'uncertaintyValue')='null' AND
   jsonb_typeof(p->'ciLower')='null' AND
   jsonb_typeof(p->'ciUpper')='null';
 END IF;
 IF v_target='not-reported' OR ep IS NULL OR
  jsonb_typeof(ep->'value')<>'number' OR
  NOT nfq_evidence_review.endpoint_spec_valid(ep) THEN RETURN false; END IF;
 IF v_kind='ci95' THEN
  IF jsonb_typeof(p->'uncertaintyValue')<>'null' OR
   jsonb_typeof(p->'ciLower')<>'number' OR
   jsonb_typeof(p->'ciUpper')<>'number'
  THEN RETURN false; END IF;
  v_lower:=(p->>'ciLower')::numeric;v_upper:=(p->>'ciUpper')::numeric;
  RETURN abs(v_lower)<=1000000 AND abs(v_upper)<=1000000 AND v_lower<v_upper;
 END IF;
 IF jsonb_typeof(p->'uncertaintyValue')<>'number' OR
  jsonb_typeof(p->'ciLower')<>'null' OR
  jsonb_typeof(p->'ciUpper')<>'null' THEN RETURN false; END IF;
 v_err:=(p->>'uncertaintyValue')::numeric;
 RETURN v_err>0 AND v_err<=1000000;
EXCEPTION WHEN numeric_value_out_of_range OR invalid_text_representation THEN
 RETURN false;
END;
$check$;
REVOKE ALL ON FUNCTION nfq_evidence_review.study_stats_valid(jsonb,jsonb)
 FROM PUBLIC,anon,authenticated,service_role;
ALTER TABLE nfq_evidence_review.claims
 ADD COLUMN IF NOT EXISTS study_stats jsonb;
ALTER TABLE nfq_evidence_review.claims
 ADD CONSTRAINT nfq_claim_study_stats_valid
 CHECK (study_stats IS NULL OR nfq_evidence_review.study_stats_valid(study_stats,endpoint));
COMMENT ON COLUMN nfq_evidence_review.claims.study_stats IS
'Exact source-reported sample/replicate n, experimental design and uncertainty; null permitted only on historical revisions; never inferred effect size.';

CREATE OR REPLACE FUNCTION public.nfq_reviewed_source_claims(
 p_action text,
 p_variant_id bigint,
 p_claim_id uuid DEFAULT NULL,
 p_payload jsonb DEFAULT NULL,
 p_expected_revision integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_actor uuid:=auth.uid();
 v_role text;
 v_claim nfq_evidence_review.claims%ROWTYPE;
 v_parent nfq_evidence_review.claims%ROWTYPE;
 v_data jsonb:=COALESCE(p_payload,'{}'::jsonb);
 v_therapy text;
 v_scope text;
 v_method text;
 v_finding text;
 v_family text;
 v_locator text;
 v_rationale text;
 v_endpoint jsonb;
 v_study_stats jsonb;
 v_reference bigint;
 v_pair jsonb;
 v_a bigint;
 v_b bigint;
 v_revision integer:=1;
 v_series uuid;
 v_new_id uuid;
 v_decision text;
 v_note text;
 v_approvals integer;
 v_result jsonb;
BEGIN
 IF v_actor IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR COALESCE(auth.jwt()->>'is_anonymous','false')='true' THEN
  RAISE EXCEPTION 'Research membership required' USING ERRCODE='42501';
 END IF;
 IF auth.jwt()->>'session_id' IS NULL OR NOT EXISTS (
  SELECT 1 FROM auth.sessions s
  WHERE s.id::text=auth.jwt()->>'session_id' AND s.user_id=v_actor
 ) THEN
  RAISE EXCEPTION 'Active auth session required' USING ERRCODE='42501';
 END IF;
 SELECT m.role INTO v_role
 FROM public.nfq_research_memberships m
 WHERE m.user_id=v_actor AND m.revoked_at IS NULL AND
   m.role IN ('contributor','reviewer','administrator');
 IF v_role IS NULL THEN
  RAISE EXCEPTION 'Active research membership required' USING ERRCODE='42501';
 END IF;
 IF p_variant_id IS NULL OR p_variant_id<1
  OR NOT EXISTS(SELECT 1 FROM public.variants WHERE id=p_variant_id) THEN
  RAISE EXCEPTION 'Unknown variant' USING ERRCODE='22023';
 END IF;
 IF p_action='list' THEN
  IF p_claim_id IS NOT NULL OR p_expected_revision IS NOT NULL OR v_data<>'{}'::jsonb THEN
   RAISE EXCEPTION 'Invalid list request' USING ERRCODE='22023';
  END IF;
  IF (SELECT count(*) FROM nfq_evidence_review.claims c WHERE c.variant_id=p_variant_id)>200 THEN
   RAISE EXCEPTION 'Incomplete claim inventory' USING ERRCODE='54000';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id',c.id::text,'seriesId',c.series_id::text,'revision',c.revision,
   'parentClaimId',c.parent_claim_id::text,'variantId',c.variant_id::text,
   'referenceId',c.reference_id,'therapy',c.therapy,'scope',c.scope,
   'genotypePair',CASE WHEN c.scope='genotype-specific'
    THEN jsonb_build_array(c.genotype_a::text,c.genotype_b::text)
    ELSE 'null'::jsonb END,
   'method',c.method,'finding',c.finding,'studyFamilyId',c.study_family_id,
   'locator',c.locator,'rationale',c.rationale,'endpoint',c.endpoint,'studyStats',c.study_stats,'status',c.status,
   'submittedAt',c.submitted_at,'submittedByMe',c.submitted_by=v_actor,
   'reviewCount',(SELECT count(*) FROM nfq_evidence_review.reviews r
     WHERE r.claim_id=c.id AND r.decision='approve'),
   'canReview',(v_role IN ('reviewer','administrator') AND
     c.submitted_by<>v_actor AND c.status='pending' AND
     NOT EXISTS(SELECT 1 FROM nfq_evidence_review.reviews r
       WHERE r.claim_id=c.id AND r.reviewer_id=v_actor)),
   'reviewedAt',CASE WHEN c.status='approved' THEN
    (SELECT max(r.reviewed_at) FROM nfq_evidence_review.reviews r
     WHERE r.claim_id=c.id AND r.decision='approve') ELSE NULL END,
   'reviewSeals',CASE WHEN c.status='approved' THEN
    COALESCE((SELECT jsonb_agg('attestation:'||r.id::text ORDER BY r.reviewed_at,r.id)
      FROM nfq_evidence_review.reviews r
      WHERE r.claim_id=c.id AND r.decision='approve'),'[]'::jsonb)
    ELSE '[]'::jsonb END,
   'audit',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'action',e.action,'at',e.at) ORDER BY e.id)
      FROM nfq_evidence_review.events e WHERE e.claim_id=c.id),'[]'::jsonb)
  ) ORDER BY c.submitted_at DESC,c.id DESC),'[]'::jsonb)
   INTO v_result
   FROM nfq_evidence_review.claims c WHERE c.variant_id=p_variant_id;
  RETURN jsonb_build_object('variantId',p_variant_id::text,
   'source','nfq-double-independent-review-v1','claims',v_result);
 END IF;

 IF p_action IN ('submit','revise') THEN
  IF p_action='submit' AND (p_claim_id IS NOT NULL OR p_expected_revision IS NOT NULL) THEN
   RAISE EXCEPTION 'Unexpected claim identity' USING ERRCODE='22023';
  END IF;
  IF p_action='revise' THEN
   IF p_claim_id IS NULL OR p_expected_revision IS NULL THEN
    RAISE EXCEPTION 'Revision source required' USING ERRCODE='22023';
   END IF;
   SELECT * INTO v_parent FROM nfq_evidence_review.claims
    WHERE id=p_claim_id AND variant_id=p_variant_id FOR UPDATE;
   IF NOT FOUND OR v_parent.revision<>p_expected_revision
    OR v_parent.status NOT IN ('approved','rejected','withdrawn')
    OR EXISTS(SELECT 1 FROM nfq_evidence_review.claims
     WHERE series_id=v_parent.series_id AND revision>v_parent.revision)
   THEN RAISE EXCEPTION 'Cannot revise stale or unfinalized claim' USING ERRCODE='40901';
   END IF;
   v_series:=v_parent.series_id;
   v_revision:=v_parent.revision+1;
  ELSE
   v_series:=gen_random_uuid();
  END IF;
  IF jsonb_typeof(v_data) IS DISTINCT FROM 'object'
   OR (SELECT count(*) FROM jsonb_object_keys(v_data)) <> 11
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_data) k
      WHERE k NOT IN('therapy','referenceId','scope','genotypePair',
       'method','finding','studyFamilyId','locator','rationale','endpoint','studyStats')) THEN
   RAISE EXCEPTION 'Invalid source claim fields' USING ERRCODE='22023';
  END IF;
  v_therapy:=v_data->>'therapy';
  v_scope:=v_data->>'scope';
  v_method:=v_data->>'method';
  v_finding:=v_data->>'finding';
  v_family:=v_data->>'studyFamilyId';
  v_locator:=v_data->>'locator';
  v_rationale:=v_data->>'rationale';
  v_endpoint:=v_data->'endpoint';
  v_study_stats:=v_data->'studyStats';
  v_pair:=v_data->'genotypePair';
  IF v_therapy NOT IN ('ETI','ALYFTREK','IVACAFTOR',
     'TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR')
   OR v_scope NOT IN ('single-variant','genotype-specific')
   OR v_method NOT IN ('clinical-study','in-vitro-study','curated-literature')
   OR v_finding NOT IN('reported-response','reported-no-response','mixed','inconclusive')
   OR v_family IS NULL OR v_family !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$'
   OR v_locator IS NULL OR length(btrim(v_locator)) NOT BETWEEN 8 AND 240
   OR v_locator ~ '[[:cntrl:]]'
   OR v_rationale IS NULL OR length(btrim(v_rationale)) NOT BETWEEN 20 AND 900
   OR v_rationale ~ '[[:cntrl:]]'
   OR COALESCE(v_data->>'referenceId','') !~ '^[1-9][0-9]{0,17}$'
  THEN RAISE EXCEPTION 'Invalid source claim values' USING ERRCODE='22023';
  END IF;
  IF v_endpoint IS NULL OR NOT nfq_evidence_review.endpoint_spec_valid(v_endpoint)
  THEN RAISE EXCEPTION 'Exact source endpoint context is required' USING ERRCODE='22023';
  END IF;
  IF v_study_stats IS NULL OR NOT nfq_evidence_review.study_stats_valid(v_study_stats,v_endpoint)
  THEN RAISE EXCEPTION 'Source-reported sampling and uncertainty context is incomplete' USING ERRCODE='22023';
  END IF;
  v_reference:=(v_data->>'referenceId')::bigint;
  IF NOT EXISTS(SELECT 1 FROM public.evidence_links e
    WHERE e.id=v_reference AND e.variant_id=p_variant_id)
  THEN RAISE EXCEPTION 'Reference does not belong to selected variant' USING ERRCODE='22023';
  END IF;
  IF v_scope='single-variant' THEN
   IF v_pair IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'Single variant claim cannot contain genotype' USING ERRCODE='22023';
   END IF;
  ELSE
   IF jsonb_typeof(v_pair) IS DISTINCT FROM 'array' OR jsonb_array_length(v_pair)<>2
    OR COALESCE(v_pair->>0,'') !~ '^[1-9][0-9]{0,17}$'
    OR COALESCE(v_pair->>1,'') !~ '^[1-9][0-9]{0,17}$'
   THEN RAISE EXCEPTION 'Genotype subject requires two variant IDs' USING ERRCODE='22023';
   END IF;
   v_a:=(v_pair->>0)::bigint;
   v_b:=(v_pair->>1)::bigint;
   IF p_variant_id NOT IN(v_a,v_b) OR NOT EXISTS
    (SELECT 1 FROM public.variants WHERE id=v_a)
    OR NOT EXISTS(SELECT 1 FROM public.variants WHERE id=v_b)
   THEN RAISE EXCEPTION 'Genotype variant identities not established' USING ERRCODE='22023';
   END IF;
  END IF;
  INSERT INTO nfq_evidence_review.claims(
   series_id,revision,parent_claim_id,variant_id,reference_id,therapy,
   scope,genotype_a,genotype_b,method,finding,study_family_id,
   locator,rationale,endpoint,study_stats,submitted_by)
  VALUES(v_series,v_revision,CASE WHEN p_action='revise' THEN p_claim_id ELSE NULL END,
   p_variant_id,v_reference,v_therapy,v_scope,v_a,v_b,v_method,v_finding,
   btrim(v_family),btrim(v_locator),btrim(v_rationale),v_endpoint,v_study_stats,v_actor)
  RETURNING id INTO v_new_id;
  INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
  VALUES(v_new_id,CASE WHEN p_action='revise' THEN 'revised' ELSE 'submitted' END,v_actor);
  RETURN jsonb_build_object('id',v_new_id::text,'revision',v_revision,'status','pending');
 END IF;

 IF p_claim_id IS NULL OR p_expected_revision IS NULL OR v_data IS NULL THEN
  RAISE EXCEPTION 'Missing expected claim state' USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_claim FROM nfq_evidence_review.claims
 WHERE id=p_claim_id AND variant_id=p_variant_id FOR UPDATE;
 IF NOT FOUND OR v_claim.revision<>p_expected_revision OR v_claim.status<>'pending' THEN
  RAISE EXCEPTION 'Claim was modified or already finalized' USING ERRCODE='40901';
 END IF;

 IF p_action='withdraw' THEN
  IF v_data<>'{}'::jsonb OR
    (v_claim.submitted_by<>v_actor AND v_role<>'administrator') THEN
   RAISE EXCEPTION 'Cannot withdraw claim' USING ERRCODE='42501';
  END IF;
  UPDATE nfq_evidence_review.claims SET status='withdrawn',finalized_at=now()
   WHERE id=v_claim.id;
  INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
   VALUES(v_claim.id,'withdrawn',v_actor);
  RETURN jsonb_build_object('id',v_claim.id::text,'status','withdrawn');
 END IF;

 IF p_action<>'review' OR v_role NOT IN ('reviewer','administrator')
  OR v_claim.submitted_by=v_actor OR EXISTS(
   SELECT 1 FROM nfq_evidence_review.reviews r
   WHERE r.claim_id=v_claim.id AND r.reviewer_id=v_actor)
 THEN RAISE EXCEPTION 'Independent scientific reviewer required' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(v_data) IS DISTINCT FROM 'object'
  OR (SELECT count(*) FROM jsonb_object_keys(v_data))<>2
  OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_data) k WHERE k NOT IN('decision','note'))
 THEN RAISE EXCEPTION 'Invalid review request' USING ERRCODE='22023';
 END IF;
 v_decision:=v_data->>'decision';
 v_note:=v_data->>'note';
 IF v_decision NOT IN ('approve','reject')
  OR v_note IS NULL OR length(btrim(v_note)) NOT BETWEEN 20 AND 900
  OR v_note ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Independent source review note required' USING ERRCODE='22023';
 END IF;
 INSERT INTO nfq_evidence_review.reviews(claim_id,reviewer_id,decision,note)
  VALUES(v_claim.id,v_actor,v_decision,btrim(v_note));
 INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
  VALUES(v_claim.id,CASE WHEN v_decision='approve' THEN 'review-approved' ELSE 'review-rejected' END,v_actor);
 IF v_decision='reject' THEN
  UPDATE nfq_evidence_review.claims SET status='rejected',finalized_at=now()
   WHERE id=v_claim.id;
  INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
  VALUES(v_claim.id,'rejected',v_actor);
  RETURN jsonb_build_object('id',v_claim.id::text,'status','rejected','reviewCount',0);
 END IF;
 SELECT count(*) INTO v_approvals FROM nfq_evidence_review.reviews
 WHERE claim_id=v_claim.id AND decision='approve';
 IF v_approvals=2 THEN
  -- Supersede only at full approval; the old approved source remains
  -- active during revision review. No archival rows are deleted.
  WITH changed AS (
   UPDATE nfq_evidence_review.claims
   SET status='superseded',finalized_at=now()
   WHERE series_id=v_claim.series_id AND status='approved'
   RETURNING id
  )
  INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
   SELECT id,'superseded',v_actor FROM changed;
  UPDATE nfq_evidence_review.claims SET status='approved',finalized_at=now()
   WHERE id=v_claim.id;
  INSERT INTO nfq_evidence_review.events(claim_id,action,actor_id)
   VALUES(v_claim.id,'approved',v_actor);
 END IF;
 RETURN jsonb_build_object('id',v_claim.id::text,
  'status',CASE WHEN v_approvals=2 THEN 'approved' ELSE 'pending' END,
  'reviewCount',v_approvals);
END;
$fn$;

REVOKE ALL ON FUNCTION public.nfq_reviewed_source_claims(text,bigint,uuid,jsonb,integer)
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nfq_reviewed_source_claims(text,bigint,uuid,jsonb,integer)
 TO authenticated;
COMMENT ON FUNCTION public.nfq_reviewed_source_claims(text,bigint,uuid,jsonb,integer) IS
'Two distinct current scientific reviewers, not the submitting researcher, attest each immutable version. Approved claims are source observations, not treatment recommendations.';
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
  OR (c.study_stats IS NOT NULL AND
    NOT nfq_evidence_review.study_stats_valid(c.study_stats,c.endpoint))
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
   'studyStats',c.study_stats,
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
