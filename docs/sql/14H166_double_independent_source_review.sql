-- Phase 14H166: versioned, immutable research-source claim proposals.
-- Source material is scientific literature metadata, not patient-level data.
-- The only exposed entry point is a checked, authenticated public RPC.
-- No caller may directly query/alter tables in the private schema.

BEGIN;
CREATE SCHEMA IF NOT EXISTS nfq_evidence_review;
REVOKE ALL ON SCHEMA nfq_evidence_review FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS nfq_evidence_review.claims (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 series_id uuid NOT NULL,
 revision integer NOT NULL CHECK (revision BETWEEN 1 AND 100),
 parent_claim_id uuid REFERENCES nfq_evidence_review.claims(id),
 variant_id bigint NOT NULL REFERENCES public.variants(id),
 reference_id bigint NOT NULL REFERENCES public.evidence_links(id),
 therapy text NOT NULL CHECK (therapy IN
   ('ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR')),
 scope text NOT NULL CHECK (scope IN ('single-variant','genotype-specific')),
 genotype_a bigint, genotype_b bigint,
 method text NOT NULL CHECK (method IN ('clinical-study','in-vitro-study','curated-literature')),
 finding text NOT NULL CHECK (finding IN
  ('reported-response','reported-no-response','mixed','inconclusive')),
 study_family_id text NOT NULL CHECK (length(study_family_id) BETWEEN 3 AND 120),
 locator text NOT NULL CHECK (length(locator) BETWEEN 8 AND 240),
 rationale text NOT NULL CHECK (length(rationale) BETWEEN 20 AND 900),
 status text NOT NULL DEFAULT 'pending'
  CHECK (status IN ('pending','approved','rejected','withdrawn','superseded')),
 submitted_by uuid NOT NULL REFERENCES auth.users(id),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 finalized_at timestamptz,
 UNIQUE(series_id,revision),
 CHECK ((scope='single-variant' AND genotype_a IS NULL AND genotype_b IS NULL)
 OR (scope='genotype-specific' AND genotype_a>0 AND genotype_b>0 AND
     (genotype_a=variant_id OR genotype_b=variant_id))),
 CHECK ((revision=1 AND parent_claim_id IS NULL) OR
  (revision>1 AND parent_claim_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS nfq_reviewed_claims_variant_idx ON nfq_evidence_review.claims
 (variant_id,submitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS nfq_reviewed_claims_one_active_idx
 ON nfq_evidence_review.claims(series_id) WHERE status='approved';

CREATE TABLE IF NOT EXISTS nfq_evidence_review.reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_id uuid NOT NULL REFERENCES nfq_evidence_review.claims(id),
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 decision text NOT NULL CHECK(decision IN ('approve','reject')),
 note text NOT NULL CHECK(length(note) BETWEEN 20 AND 900),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(claim_id,reviewer_id)
);
CREATE INDEX IF NOT EXISTS nfq_reviewed_reviews_claim_idx ON nfq_evidence_review.reviews(claim_id);

CREATE TABLE IF NOT EXISTS nfq_evidence_review.events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 claim_id uuid NOT NULL REFERENCES nfq_evidence_review.claims(id),
 action text NOT NULL CHECK(action IN ('submitted','revised','review-approved',
   'review-rejected','approved','rejected','withdrawn','superseded')),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 at timestamptz NOT NULL DEFAULT now(),
 note text
);
CREATE INDEX IF NOT EXISTS nfq_reviewed_events_claim_idx ON nfq_evidence_review.events(claim_id,at);

ALTER TABLE nfq_evidence_review.claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfq_evidence_review.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfq_evidence_review.events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA nfq_evidence_review FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA nfq_evidence_review FROM PUBLIC,anon,authenticated,service_role;

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
   'locator',c.locator,'rationale',c.rationale,'status',c.status,
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
   OR (SELECT count(*) FROM jsonb_object_keys(v_data)) <> 9
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(v_data) k
      WHERE k NOT IN('therapy','referenceId','scope','genotypePair',
       'method','finding','studyFamilyId','locator','rationale')) THEN
   RAISE EXCEPTION 'Invalid source claim fields' USING ERRCODE='22023';
  END IF;
  v_therapy:=v_data->>'therapy';
  v_scope:=v_data->>'scope';
  v_method:=v_data->>'method';
  v_finding:=v_data->>'finding';
  v_family:=v_data->>'studyFamilyId';
  v_locator:=v_data->>'locator';
  v_rationale:=v_data->>'rationale';
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
   locator,rationale,submitted_by)
  VALUES(v_series,v_revision,CASE WHEN p_action='revise' THEN p_claim_id ELSE NULL END,
   p_variant_id,v_reference,v_therapy,v_scope,v_a,v_b,v_method,v_finding,
   btrim(v_family),btrim(v_locator),btrim(v_rationale),v_actor)
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
COMMIT;
