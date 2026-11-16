-- Phase 14H168 · Research source acquisition worklist.
-- Research-only administrative triage: NOT literature verification, not a
-- treatment evidence claim, not an approval, no patient data.
BEGIN;
CREATE TABLE IF NOT EXISTS nfq_evidence_review.source_triage (
 reference_id bigint PRIMARY KEY REFERENCES public.evidence_links(id),
 state text NOT NULL CHECK (state IN (
  'source-located','metadata-needs-check','extraction-in-progress',
  'ready-for-claim','not-extractable')),
 note text NOT NULL CHECK (length(btrim(note)) BETWEEN 20 AND 700 AND note !~ '[[:cntrl:]]'),
 version integer NOT NULL DEFAULT 1 CHECK(version BETWEEN 1 AND 100),
 updated_by uuid NOT NULL REFERENCES auth.users(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS nfq_evidence_review.source_triage_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reference_id bigint NOT NULL REFERENCES public.evidence_links(id),
 version integer NOT NULL CHECK(version BETWEEN 1 AND 100),
 previous_state text,
 next_state text NOT NULL CHECK (next_state IN (
  'source-located','metadata-needs-check','extraction-in-progress',
  'ready-for-claim','not-extractable')),
 note text NOT NULL CHECK (length(btrim(note)) BETWEEN 20 AND 700),
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 changed_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(reference_id,version)
);
ALTER TABLE nfq_evidence_review.source_triage ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfq_evidence_review.source_triage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON nfq_evidence_review.source_triage FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON nfq_evidence_review.source_triage_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE nfq_evidence_review.source_triage_events_id_seq
 FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.nfq_source_acquisition_worklist(
 p_action text,
 p_reference_id bigint DEFAULT NULL,
 p_expected_version integer DEFAULT NULL,
 p_state text DEFAULT NULL,
 p_note text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_actor uuid:=auth.uid();
 v_version integer;
 v_prior text;
 v_next integer;
 v_variant bigint;
 v_records jsonb;
 v_total integer;
BEGIN
 IF v_actor IS NULL OR auth.jwt()->>'role' IS DISTINCT FROM 'authenticated'
  OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
  OR auth.jwt()->>'session_id' IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.sessions s WHERE s.id::text=auth.jwt()->>'session_id'
    AND s.user_id=v_actor
  ) OR NOT EXISTS (
    SELECT 1 FROM public.nfq_research_memberships m
    WHERE m.user_id=v_actor AND m.revoked_at IS NULL
    AND m.role IN ('contributor','reviewer','administrator')
  )
 THEN RAISE EXCEPTION 'Active research membership required' USING ERRCODE='42501';
 END IF;
 IF p_action='list' THEN
  IF p_reference_id IS NOT NULL OR p_expected_version IS NOT NULL
   OR p_state IS NOT NULL OR p_note IS NOT NULL
  THEN RAISE EXCEPTION 'Unexpected list arguments' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO v_total FROM public.evidence_links;
  IF v_total>1000 THEN
   RAISE EXCEPTION 'Source worklist exceeds supported complete view' USING ERRCODE='54000';
  END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id',e.id,'variantId',e.variant_id::text,'title',e.title,
   'url',e.url,'source',e.source,'year',e.year,
   'pmid',e.pmid,'doi',e.doi,
   'state',COALESCE(t.state,'untriaged'),
   'note',t.note,'version',COALESCE(t.version,0),
   'updatedAt',t.updated_at,
   'updatedByMe',COALESCE(t.updated_by=v_actor,false),
   'auditCount',(SELECT count(*) FROM nfq_evidence_review.source_triage_events ev
      WHERE ev.reference_id=e.id),
   'claimPending',(SELECT count(*) FROM nfq_evidence_review.claims c
      WHERE c.reference_id=e.id AND c.variant_id=e.variant_id AND c.status='pending'),
   'claimApproved',(SELECT count(*) FROM nfq_evidence_review.claims c
      WHERE c.reference_id=e.id AND c.variant_id=e.variant_id AND c.status='approved'),
   'numericApproved',(SELECT count(*) FROM nfq_evidence_review.claims c
      WHERE c.reference_id=e.id AND c.variant_id=e.variant_id AND c.status='approved'
        AND c.endpoint IS NOT NULL AND jsonb_typeof(c.endpoint->'value')='number')
  ) ORDER BY e.id),'[]'::jsonb)
  INTO v_records
  FROM public.evidence_links e
  LEFT JOIN nfq_evidence_review.source_triage t ON t.reference_id=e.id;
  RETURN jsonb_build_object('source','nfq-acquisition-worklist-v1',
   'total',v_total,'records',v_records);
 END IF;
 IF p_action IS DISTINCT FROM 'triage' OR p_reference_id IS NULL OR
  p_reference_id<1 OR p_expected_version IS NULL OR p_expected_version<0 OR
  p_expected_version>=100 OR
  p_state NOT IN ('source-located','metadata-needs-check',
    'extraction-in-progress','ready-for-claim','not-extractable') OR
  p_note IS NULL OR length(btrim(p_note)) NOT BETWEEN 20 AND 700 OR
  p_note ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Invalid acquisition-triage request' USING ERRCODE='22023';
 END IF;
 SELECT e.variant_id INTO v_variant
 FROM public.evidence_links e WHERE e.id=p_reference_id;
 IF v_variant IS NULL THEN
  RAISE EXCEPTION 'Unlinked or unknown research reference' USING ERRCODE='22023';
 END IF;
 -- Serialize first-time writes on the reference row, then lock its triage row.
 PERFORM 1 FROM public.evidence_links e WHERE e.id=p_reference_id FOR UPDATE;
 SELECT t.version,t.state INTO v_version,v_prior
 FROM nfq_evidence_review.source_triage t
 WHERE t.reference_id=p_reference_id FOR UPDATE;
 IF COALESCE(v_version,0)<>p_expected_version THEN
  RAISE EXCEPTION 'Source record was revised; refresh before editing' USING ERRCODE='40001';
 END IF;
 IF v_version IS NOT NULL AND v_prior=p_state THEN
  RAISE EXCEPTION 'No state change to record' USING ERRCODE='22023';
 END IF;
 IF v_version IS NULL THEN
  INSERT INTO nfq_evidence_review.source_triage
   (reference_id,state,note,version,updated_by)
  VALUES (p_reference_id,p_state,btrim(p_note),1,v_actor);
  v_next:=1;
 ELSE
  UPDATE nfq_evidence_review.source_triage
   SET state=p_state,note=btrim(p_note),version=version+1,
    updated_by=v_actor,updated_at=now()
   WHERE reference_id=p_reference_id
   RETURNING version INTO v_next;
 END IF;
 INSERT INTO nfq_evidence_review.source_triage_events
  (reference_id,version,previous_state,next_state,note,actor_id)
 VALUES (p_reference_id,v_next,v_prior,p_state,btrim(p_note),v_actor);
 RETURN jsonb_build_object('source','nfq-acquisition-worklist-v1',
  'referenceId',p_reference_id,'variantId',v_variant::text,
  'state',p_state,'version',v_next);
END;
$fn$;
REVOKE ALL ON FUNCTION public.nfq_source_acquisition_worklist(
 text,bigint,integer,text,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.nfq_source_acquisition_worklist(
 text,bigint,integer,text,text) TO authenticated;
COMMENT ON FUNCTION public.nfq_source_acquisition_worklist(
 text,bigint,integer,text,text) IS
'Authenticated active researchers only. Exact referenced source acquisition triage and locked audit; does not approve or mutate scientific claims or therapy responses.';
COMMIT;
