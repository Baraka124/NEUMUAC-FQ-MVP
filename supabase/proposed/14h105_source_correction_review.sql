-- Phase 14H105: isolated source-correction proposals. NOT a publication pathway.
-- Must be reviewed on a disposable PostgreSQL database before production deployment.
BEGIN;
CREATE TABLE public.nfq_source_correction_proposals (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 reference_id bigint NOT NULL REFERENCES public.evidence_links(id) ON DELETE RESTRICT,
 variant_id bigint NOT NULL REFERENCES public.variants(id) ON DELETE RESTRICT,
 field_name text NOT NULL CHECK (field_name IN ('title','type','category','journal','year','doi','pmid')),
 recorded_value text,
 proposed_value text NOT NULL CHECK (char_length(btrim(proposed_value)) BETWEEN 1 AND 200),
 rationale text NOT NULL CHECK (char_length(btrim(rationale)) BETWEEN 15 AND 900),
 created_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','accepted','rejected')),
 reviewed_by uuid REFERENCES auth.users(id),
 reviewed_at timestamptz,
 review_note text,
 CONSTRAINT nfq_source_review_consistency CHECK (
   (status='submitted' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_note IS NULL)
   OR (status IN ('accepted','rejected') AND reviewed_by IS NOT NULL
     AND reviewed_at IS NOT NULL AND char_length(btrim(review_note)) BETWEEN 15 AND 900
     AND reviewed_by <> created_by)
 )
);
CREATE TABLE public.nfq_source_correction_events (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 proposal_id bigint NOT NULL REFERENCES public.nfq_source_correction_proposals(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES auth.users(id),
 action text NOT NULL CHECK (action IN ('submitted','accepted','rejected')),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.nfq_source_correction_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfq_source_correction_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nfq_source_correction_proposals, public.nfq_source_correction_events FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.nfq_source_correction_proposals_id_seq, public.nfq_source_correction_events_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.nfq_source_correction_proposals TO authenticated;
CREATE POLICY nfq_source_proposal_read_own_or_reviewer
ON public.nfq_source_correction_proposals FOR SELECT TO authenticated
USING (
 created_by=(SELECT auth.uid()) OR EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m
  WHERE m.user_id=(SELECT auth.uid()) AND m.revoked_at IS NULL
    AND m.role IN ('reviewer','administrator')
 )
);
-- No direct table writes are available to browser roles. The event ledger has no public read policy.

CREATE FUNCTION public.nfq_submit_source_correction(
 p_reference_id bigint,p_field_name text,p_proposed_value text,p_rationale text
) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 actor uuid := (SELECT auth.uid());
 source_row public.evidence_links%ROWTYPE;
 snapshot text;
 new_id bigint;
BEGIN
 IF actor IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m
  WHERE m.user_id=actor AND m.revoked_at IS NULL AND m.role IN ('contributor','reviewer','administrator')
 ) THEN RAISE EXCEPTION 'Active research membership required' USING ERRCODE='42501'; END IF;
 IF p_field_name IS NULL OR p_field_name NOT IN ('title','type','category','journal','year','doi','pmid')
  OR p_proposed_value IS NULL OR char_length(btrim(p_proposed_value)) NOT BETWEEN 1 AND 200
  OR p_rationale IS NULL OR char_length(btrim(p_rationale)) NOT BETWEEN 15 AND 900
  OR p_proposed_value ~ '[[:cntrl:]]' OR p_rationale ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Invalid source correction' USING ERRCODE='22023'; END IF;
 IF (p_field_name='year' AND p_proposed_value !~ '^(18|19|20)[0-9]{2}$')
    OR (p_field_name='pmid' AND p_proposed_value !~ '^[1-9][0-9]{0,11}$')
    OR (p_field_name='doi' AND p_proposed_value !~* '^10[.][0-9]{4,9}/[^[:space:]]{1,160}$')
 THEN RAISE EXCEPTION 'Invalid field format' USING ERRCODE='22023'; END IF;
 SELECT * INTO source_row FROM public.evidence_links WHERE id=p_reference_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Recorded reference does not exist' USING ERRCODE='22023'; END IF;
 snapshot:=CASE p_field_name
  WHEN 'title' THEN source_row.title WHEN 'type' THEN source_row.type
  WHEN 'category' THEN source_row.category WHEN 'journal' THEN source_row.journal
  WHEN 'year' THEN source_row.year::text WHEN 'doi' THEN source_row.doi
  WHEN 'pmid' THEN source_row.pmid END;
 IF snapshot IS NOT DISTINCT FROM btrim(p_proposed_value) THEN
  RAISE EXCEPTION 'No change proposed' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.nfq_source_correction_proposals
  (reference_id,variant_id,field_name,recorded_value,proposed_value,rationale,created_by)
 VALUES (source_row.id,source_row.variant_id,p_field_name,snapshot,btrim(p_proposed_value),btrim(p_rationale),actor)
 RETURNING id INTO new_id;
 INSERT INTO public.nfq_source_correction_events(proposal_id,actor_id,action)
 VALUES(new_id,actor,'submitted');
 RETURN new_id;
END;
$fn$;

CREATE FUNCTION public.nfq_review_source_correction(
 p_proposal_id bigint,p_decision text,p_review_note text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
 actor uuid := (SELECT auth.uid());
 item public.nfq_source_correction_proposals%ROWTYPE;
BEGIN
 IF actor IS NULL OR NOT EXISTS (
  SELECT 1 FROM public.nfq_research_memberships m WHERE m.user_id=actor
  AND m.revoked_at IS NULL AND m.role IN ('reviewer','administrator')
 ) THEN RAISE EXCEPTION 'Scientific reviewer role required' USING ERRCODE='42501'; END IF;
 IF p_decision IS NULL OR p_decision NOT IN ('accepted','rejected')
  OR p_review_note IS NULL OR char_length(btrim(p_review_note)) NOT BETWEEN 15 AND 900
  OR p_review_note ~ '[[:cntrl:]]'
 THEN RAISE EXCEPTION 'Invalid review decision' USING ERRCODE='22023'; END IF;
 SELECT * INTO item FROM public.nfq_source_correction_proposals WHERE id=p_proposal_id FOR UPDATE;
 IF NOT FOUND OR item.status<>'submitted' THEN
   RAISE EXCEPTION 'Proposal unavailable or already decided' USING ERRCODE='22023';
 END IF;
 IF item.created_by=actor THEN
   RAISE EXCEPTION 'Independent scientific reviewer required' USING ERRCODE='42501';
 END IF;
 -- Review acceptance is *only* a decision record. It never alters the source.
 UPDATE public.nfq_source_correction_proposals
 SET status=p_decision,reviewed_by=actor,reviewed_at=now(),review_note=btrim(p_review_note)
 WHERE id=p_proposal_id;
 INSERT INTO public.nfq_source_correction_events(proposal_id,actor_id,action)
 VALUES(p_proposal_id,actor,p_decision);
END;
$fn$;
REVOKE ALL ON FUNCTION public.nfq_submit_source_correction(bigint,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.nfq_review_source_correction(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nfq_submit_source_correction(bigint,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.nfq_review_source_correction(bigint,text,text) TO authenticated;
COMMENT ON TABLE public.nfq_source_correction_proposals IS 'Submitted suggestions only; review acceptance does not change published evidence. Never include patient data.';
COMMENT ON TABLE public.nfq_source_correction_events IS 'Private append-only proposal audit ledger; no browser direct writes.';
COMMIT;
