-- Phase 14H173. A versioned independent scientific adjudication ledger
-- for whether two ALREADY approved source claims describe the same study.
-- No changes to therapy classifications or to approved source observations.
BEGIN;

CREATE TABLE nfq_evidence_review.study_adjudications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 claim_a uuid NOT NULL REFERENCES nfq_evidence_review.claims(id),
 claim_b uuid NOT NULL REFERENCES nfq_evidence_review.claims(id),
 revision integer NOT NULL DEFAULT 1 CHECK (revision BETWEEN 1 AND 100),
 parent_id uuid REFERENCES nfq_evidence_review.study_adjudications(id),
 disposition text NOT NULL CHECK (disposition IN
   ('same-study','distinct-studies','insufficient-evidence')),
 rationale text NOT NULL CHECK (length(rationale) BETWEEN 30 AND 900),
 evidence_locator text NOT NULL CHECK (length(evidence_locator) BETWEEN 8 AND 240),
 status text NOT NULL DEFAULT 'pending' CHECK (status IN
   ('pending','approved','rejected','superseded')),
 submitted_by uuid NOT NULL REFERENCES auth.users(id),
 submitted_at timestamptz NOT NULL DEFAULT now(),
 decided_at timestamptz,
 UNIQUE (claim_a,claim_b,revision),
 CHECK (claim_a::text < claim_b::text),
 CHECK ((revision=1 AND parent_id IS NULL) OR (revision>1 AND parent_id IS NOT NULL))
);
CREATE INDEX nfq_study_adjudications_pair_lookup
 ON nfq_evidence_review.study_adjudications(claim_a,claim_b,revision DESC);
CREATE TABLE nfq_evidence_review.study_adjudication_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 adjudication_id uuid NOT NULL REFERENCES nfq_evidence_review.study_adjudications(id),
 reviewer_id uuid NOT NULL REFERENCES auth.users(id),
 decision text NOT NULL CHECK(decision IN ('approve','reject')),
 note text NOT NULL CHECK(length(note) BETWEEN 20 AND 500),
 reviewed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(adjudication_id,reviewer_id)
);
CREATE INDEX nfq_study_adjudication_review_idx
 ON nfq_evidence_review.study_adjudication_reviews(adjudication_id);

ALTER TABLE nfq_evidence_review.study_adjudications ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfq_evidence_review.study_adjudication_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE nfq_evidence_review.study_adjudications
 FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON TABLE nfq_evidence_review.study_adjudication_reviews
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.nfq_study_adjudications(
 p_action text,
 p_claim_a uuid DEFAULT NULL,
 p_claim_b uuid DEFAULT NULL,
 p_adjudication_id uuid DEFAULT NULL,
 p_disposition text DEFAULT NULL,
 p_rationale text DEFAULT NULL,
 p_evidence_locator text DEFAULT NULL,
 p_expected_revision integer DEFAULT NULL,
 p_review_decision text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_actor uuid := auth.uid();
 v_role text;
 v_a uuid;v_b uuid;v_tmp uuid;
 v_previous nfq_evidence_review.study_adjudications%ROWTYPE;
 v_current nfq_evidence_review.study_adjudications%ROWTYPE;
 v_approve_count integer;
 v_result jsonb;
 v_total integer;
 v_new uuid;
BEGIN
 IF v_actor IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
  OR auth.jwt()->>'session_id' IS NULL OR NOT EXISTS (
   SELECT 1 FROM auth.sessions s
   WHERE s.id::text=auth.jwt()->>'session_id' AND s.user_id=v_actor
  )
 THEN RAISE EXCEPTION 'Current research session required' USING ERRCODE='42501';
 END IF;
 SELECT m.role INTO v_role FROM public.nfq_research_memberships m
  WHERE m.user_id=v_actor AND m.revoked_at IS NULL
   AND m.role IN ('contributor','reviewer','administrator');
 IF v_role IS NULL THEN RAISE EXCEPTION 'Active research membership required' USING ERRCODE='42501'; END IF;

 IF p_action='list' THEN
  IF p_claim_a IS NOT NULL OR p_claim_b IS NOT NULL OR
   p_adjudication_id IS NOT NULL OR p_disposition IS NOT NULL OR
   p_rationale IS NOT NULL OR p_evidence_locator IS NOT NULL OR
   p_expected_revision IS NOT NULL OR p_review_decision IS NOT NULL
  THEN RAISE EXCEPTION 'Invalid adjudication list request' USING ERRCODE='22023'; END IF;
  -- Only the latest revision of a pair, and only currently approved source
  -- claims. Obsolete/superseded science cannot silently affect a new dataset.
  SELECT count(*) INTO v_total FROM (
   SELECT DISTINCT ON (a.claim_a,a.claim_b) a.id
   FROM nfq_evidence_review.study_adjudications a
   JOIN nfq_evidence_review.claims ca ON ca.id=a.claim_a AND ca.status='approved'
   JOIN nfq_evidence_review.claims cb ON cb.id=a.claim_b AND cb.status='approved'
   ORDER BY a.claim_a,a.claim_b,a.revision DESC
  ) z;
  IF v_total>250 THEN
   RAISE EXCEPTION 'Adjudication inventory exceeds complete response limit'
    USING ERRCODE='54000';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id',a.id::text,'claimA',a.claim_a::text,'claimB',a.claim_b::text,
   'revision',a.revision,'disposition',a.disposition,
   'rationale',a.rationale,'evidenceLocator',a.evidence_locator,
   'status',a.status,'submittedAt',a.submitted_at,'decidedAt',a.decided_at,
   'reviewCount',(SELECT count(*) FROM nfq_evidence_review.study_adjudication_reviews r
    WHERE r.adjudication_id=a.id AND r.decision='approve'),
   'submittedByMe',a.submitted_by=v_actor,
   'canReview',v_role IN ('reviewer','administrator') AND a.status='pending'
     AND a.submitted_by<>v_actor AND
     NOT EXISTS(SELECT 1 FROM nfq_evidence_review.study_adjudication_reviews r
      WHERE r.adjudication_id=a.id AND r.reviewer_id=v_actor)
  ) ORDER BY a.claim_a,a.claim_b),'[]'::jsonb) INTO v_result
  FROM (
   SELECT DISTINCT ON (a.claim_a,a.claim_b) a.*
   FROM nfq_evidence_review.study_adjudications a
   JOIN nfq_evidence_review.claims ca ON ca.id=a.claim_a AND ca.status='approved'
   JOIN nfq_evidence_review.claims cb ON cb.id=a.claim_b AND cb.status='approved'
   ORDER BY a.claim_a,a.claim_b,a.revision DESC
  ) a;
  RETURN jsonb_build_object(
   'source','nfq-study-adjudication-v1','total',v_total,'records',v_result);
 END IF;

 IF p_action='propose' THEN
  IF p_adjudication_id IS NOT NULL OR p_review_decision IS NOT NULL OR
   p_claim_a IS NULL OR p_claim_b IS NULL OR p_claim_a=p_claim_b OR
   p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 0 AND 99 OR
   p_disposition IS NULL OR p_disposition NOT IN ('same-study','distinct-studies','insufficient-evidence')
   OR p_rationale IS NULL OR length(p_rationale) NOT BETWEEN 30 AND 900 OR
   p_rationale<>btrim(p_rationale) OR p_rationale ~ '[[:cntrl:]]' OR
   p_evidence_locator IS NULL OR length(p_evidence_locator) NOT BETWEEN 8 AND 240 OR
   p_evidence_locator<>btrim(p_evidence_locator) OR p_evidence_locator ~ '[[:cntrl:]]'
  THEN RAISE EXCEPTION 'Invalid source-based adjudication proposal' USING ERRCODE='22023';END IF;
  v_a:=p_claim_a;v_b:=p_claim_b;
  IF v_a::text>v_b::text THEN v_tmp:=v_a;v_a:=v_b;v_b:=v_tmp;END IF;
  -- Serialize pair proposals; a revision cannot be created concurrently
  -- under a stale view of the pair.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_a::text||':'||v_b::text,0));
  IF (SELECT count(*) FROM nfq_evidence_review.claims c
   WHERE c.id IN (v_a,v_b) AND c.status='approved')<>2
  THEN RAISE EXCEPTION 'Both independent source claims must remain approved' USING ERRCODE='40901'; END IF;
  SELECT * INTO v_previous FROM nfq_evidence_review.study_adjudications a
   WHERE a.claim_a=v_a AND a.claim_b=v_b
   ORDER BY a.revision DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
   IF v_previous.revision<>p_expected_revision OR v_previous.status='pending'
    OR v_previous.revision>=100
   THEN RAISE EXCEPTION 'Stale or unfinalized pair adjudication' USING ERRCODE='40901'; END IF;
  ELSIF p_expected_revision<>0 THEN
   RAISE EXCEPTION 'Unrecognized adjudication revision' USING ERRCODE='40901';
  END IF;
  INSERT INTO nfq_evidence_review.study_adjudications(
   claim_a,claim_b,revision,parent_id,disposition,rationale,evidence_locator,submitted_by)
  VALUES(v_a,v_b,COALESCE(v_previous.revision,0)+1,v_previous.id,
   p_disposition,p_rationale,p_evidence_locator,v_actor)
  RETURNING id INTO v_new;
  RETURN jsonb_build_object('source','nfq-study-adjudication-v1',
   'id',v_new::text,'status','pending','revision',COALESCE(v_previous.revision,0)+1);
 END IF;

 IF p_action='review' THEN
  IF v_role NOT IN ('reviewer','administrator') OR
   p_adjudication_id IS NULL OR p_claim_a IS NOT NULL OR p_claim_b IS NOT NULL OR
   p_disposition IS NOT NULL OR p_evidence_locator IS NOT NULL OR
   p_expected_revision IS NULL OR p_expected_revision NOT BETWEEN 1 AND 100 OR
   p_review_decision IS NULL OR p_review_decision NOT IN ('approve','reject') OR
   p_rationale IS NULL OR length(p_rationale) NOT BETWEEN 20 AND 500 OR
   p_rationale<>btrim(p_rationale) OR p_rationale ~ '[[:cntrl:]]'
  THEN RAISE EXCEPTION 'Independent scientific review required' USING ERRCODE='42501'; END IF;
  SELECT * INTO v_current FROM nfq_evidence_review.study_adjudications a
   WHERE a.id=p_adjudication_id FOR UPDATE;
  IF NOT FOUND OR v_current.status<>'pending'
   OR v_current.revision<>p_expected_revision OR
   v_current.submitted_by=v_actor OR
   EXISTS(SELECT 1 FROM nfq_evidence_review.study_adjudication_reviews r
      WHERE r.adjudication_id=v_current.id AND r.reviewer_id=v_actor) OR
   EXISTS(SELECT 1 FROM nfq_evidence_review.study_adjudications newer
    WHERE newer.claim_a=v_current.claim_a AND newer.claim_b=v_current.claim_b
     AND newer.revision>v_current.revision)
  THEN RAISE EXCEPTION 'Stale or unauthorized independent review' USING ERRCODE='40901'; END IF;
  IF (SELECT count(*) FROM nfq_evidence_review.claims c WHERE
    c.id IN(v_current.claim_a,v_current.claim_b) AND c.status='approved')<>2
  THEN RAISE EXCEPTION 'Source claims are no longer approved' USING ERRCODE='40901'; END IF;
  INSERT INTO nfq_evidence_review.study_adjudication_reviews(
    adjudication_id,reviewer_id,decision,note)
  VALUES(v_current.id,v_actor,p_review_decision,p_rationale);
  IF p_review_decision='reject' THEN
   UPDATE nfq_evidence_review.study_adjudications SET
    status='rejected',decided_at=now() WHERE id=v_current.id;
  ELSE
   SELECT count(DISTINCT r.reviewer_id) INTO v_approve_count
   FROM nfq_evidence_review.study_adjudication_reviews r
   WHERE r.adjudication_id=v_current.id AND r.decision='approve';
   IF v_approve_count>=2 THEN
    UPDATE nfq_evidence_review.study_adjudications SET
     status='approved',decided_at=now() WHERE id=v_current.id;
    -- Prior approved decision remains active until two fresh independent reviews.
    UPDATE nfq_evidence_review.study_adjudications SET
     status='superseded' WHERE id=v_current.parent_id AND status='approved';
   END IF;
  END IF;
  RETURN jsonb_build_object('source','nfq-study-adjudication-v1',
   'id',v_current.id::text,'revision',v_current.revision,
   'status',CASE WHEN p_review_decision='reject' THEN 'rejected'
    WHEN v_approve_count>=2 THEN 'approved' ELSE 'pending' END);
 END IF;
 RAISE EXCEPTION 'Unknown adjudication action' USING ERRCODE='22023';
END;
$fn$;
REVOKE ALL ON FUNCTION public.nfq_study_adjudications(
 text,uuid,uuid,uuid,text,text,text,integer,text)
 FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nfq_study_adjudications(
 text,uuid,uuid,uuid,text,text,text,integer,text)
 TO authenticated;
COMMENT ON FUNCTION public.nfq_study_adjudications(
 text,uuid,uuid,uuid,text,text,text,integer,text)
 IS 'Source-pair adjudication requires active research membership, current auth session and two different scientific reviewers excluding the proposer. No therapy rule changes.';
COMMIT;
