-- PHASE 2K-T: staging-only authenticated clinical operation prototype
-- No writes to existing clinical tables; no live Supabase deployment.
BEGIN;
CREATE SCHEMA IF NOT EXISTS nfq_clinical;
REVOKE ALL ON SCHEMA nfq_clinical FROM PUBLIC,anon,authenticated;

CREATE TABLE nfq_clinical.role_grants(
 actor_id uuid NOT NULL, role_name text NOT NULL CHECK (role_name IN ('clinician','reviewer')),
 enabled boolean NOT NULL DEFAULT true, PRIMARY KEY(actor_id,role_name));
CREATE TABLE nfq_clinical.notes(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 variant_id bigint NOT NULL,
 body text NOT NULL CHECK(length(btrim(body)) BETWEEN 1 AND 4000),
 author_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE TABLE nfq_clinical.review_decisions(
 review_id bigint PRIMARY KEY,
 variant_id bigint NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
 version integer NOT NULL DEFAULT 0,
 decided_by uuid, decided_at timestamptz,
 CHECK ((status='pending' AND decided_by IS NULL AND decided_at IS NULL) OR
 (status<>'pending' AND decided_by IS NOT NULL AND decided_at IS NOT NULL)));
CREATE TABLE nfq_clinical.operation_events(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 request_key text NOT NULL UNIQUE,
 command_hash text NOT NULL,
 actor_id uuid NOT NULL,
 operation text NOT NULL CHECK(operation IN ('add-note','decide-review')),
 target_id text NOT NULL,
 result jsonb NOT NULL,
 occurred_at timestamptz NOT NULL DEFAULT clock_timestamp());
CREATE FUNCTION nfq_clinical.deny_history_mutation() RETURNS trigger
LANGUAGE plpgsql SET search_path=''
AS $$ BEGIN RAISE EXCEPTION 'audit_history_immutable'; END $$;
CREATE TRIGGER history_immutable BEFORE UPDATE OR DELETE ON nfq_clinical.operation_events
FOR EACH ROW EXECUTE FUNCTION nfq_clinical.deny_history_mutation();

DO $rls$ DECLARE t text;
BEGIN FOREACH t IN ARRAY ARRAY['role_grants','notes','review_decisions','operation_events']
LOOP EXECUTE format('ALTER TABLE nfq_clinical.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END $rls$;
REVOKE ALL ON ALL TABLES IN SCHEMA nfq_clinical FROM PUBLIC,anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA nfq_clinical FROM PUBLIC,anon,authenticated;

-- Supabase auth.uid() must be cryptographically authenticated by PostgREST.
-- CI mocks JWT claim plumbing only, NOT token-signature validation.
CREATE FUNCTION public.nfq_stage_clinical_command(
 p_action text,p_variant_id bigint,p_review_id bigint,p_expected_version integer,
 p_body text,p_decision text,p_request_key text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $fn$
DECLARE
 v_actor uuid := auth.uid();
 v_old nfq_clinical.operation_events%ROWTYPE;
 v_review nfq_clinical.review_decisions%ROWTYPE;
 v_hash text;
 v_result jsonb;
 v_note uuid;
 v_operation text;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'authentication_required' USING ERRCODE='28000'; END IF;
 IF p_action NOT IN ('add-note','decide-review') OR p_action IS NULL
   OR p_variant_id IS NULL OR p_variant_id<1
   OR p_request_key IS NULL OR p_request_key !~ '^[A-Za-z0-9_-]{12,128}$'
 THEN RAISE EXCEPTION 'invalid_command' USING ERRCODE='22023'; END IF;
 IF p_action='add-note' AND
   (p_review_id IS NOT NULL OR p_expected_version IS NOT NULL OR p_decision IS NOT NULL
    OR p_body IS NULL OR length(btrim(p_body)) NOT BETWEEN 1 AND 4000)
 THEN RAISE EXCEPTION 'invalid_note_command' USING ERRCODE='22023'; END IF;
 IF p_action='decide-review' AND
  (p_review_id IS NULL OR p_expected_version IS NULL OR p_expected_version<0
   OR p_body IS NOT NULL OR p_decision NOT IN ('approved','rejected') OR p_decision IS NULL)
 THEN RAISE EXCEPTION 'invalid_review_command' USING ERRCODE='22023'; END IF;
 v_operation:=p_action;
 v_hash:=md5(pg_catalog.jsonb_build_object('actor',v_actor,'action',p_action,
   'variant',p_variant_id,'review',p_review_id,'version',p_expected_version,
   'body',p_body,'decision',p_decision)::text);

 -- Serialize command keys even when requests are for unrelated records.
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_key,42));
 SELECT * INTO v_old FROM nfq_clinical.operation_events WHERE request_key=p_request_key;
 IF FOUND THEN
  IF v_old.actor_id<>v_actor OR v_old.command_hash<>v_hash THEN
   RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE='23505';
  END IF;
  RETURN v_old.result || '{"replayed":true}'::jsonb;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM nfq_clinical.role_grants g WHERE
   g.actor_id=v_actor AND g.enabled AND g.role_name=
   CASE WHEN p_action='add-note' THEN 'clinician' ELSE 'reviewer' END)
 THEN RAISE EXCEPTION 'operation_not_authorized' USING ERRCODE='42501'; END IF;
 -- Do not trust a caller's arbitrary variant id. Verify against real source.
 IF NOT EXISTS(SELECT 1 FROM public.variants v WHERE v.id=p_variant_id)
 THEN RAISE EXCEPTION 'variant_not_found' USING ERRCODE='P0002'; END IF;

 IF p_action='add-note' THEN
  INSERT INTO nfq_clinical.notes(variant_id,body,author_id)
  VALUES(p_variant_id,btrim(p_body),v_actor) RETURNING id INTO v_note;
  v_result:=pg_catalog.jsonb_build_object('noteId',v_note,'variantId',p_variant_id,'replayed',false);
 ELSE
  SELECT * INTO v_review FROM nfq_clinical.review_decisions
    WHERE review_id=p_review_id FOR UPDATE;
  IF NOT FOUND OR v_review.variant_id<>p_variant_id THEN
    RAISE EXCEPTION 'review_not_found' USING ERRCODE='P0002'; END IF;
  IF v_review.status<>'pending' OR v_review.version<>p_expected_version THEN
    RAISE EXCEPTION 'review_state_conflict' USING ERRCODE='40001'; END IF;
  UPDATE nfq_clinical.review_decisions SET status=p_decision,version=version+1,
    decided_by=v_actor,decided_at=clock_timestamp() WHERE review_id=p_review_id;
  v_result:=pg_catalog.jsonb_build_object('reviewId',p_review_id,'status',p_decision,'version',v_review.version+1,'replayed',false);
 END IF;
 INSERT INTO nfq_clinical.operation_events
 (request_key,command_hash,actor_id,operation,target_id,result)
 VALUES(p_request_key,v_hash,v_actor,v_operation,
   CASE WHEN p_action='add-note' THEN p_variant_id::text ELSE p_review_id::text END,v_result);
 RETURN v_result;
END $fn$;

REVOKE ALL ON FUNCTION public.nfq_stage_clinical_command(text,bigint,bigint,integer,text,text,text)
 FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.nfq_stage_clinical_command(text,bigint,bigint,integer,text,text,text)
 TO authenticated;
COMMIT;
