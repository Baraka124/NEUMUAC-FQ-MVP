\set ON_ERROR_STOP on
-- Disposable PostgreSQL 17 research review ledger recovery contract.
-- Execute ONLY in disposable GitHub Actions after 002..006. Does not
-- create a production table or turn on any Helios write surface.
DO $audit$
DECLARE
  entry record;
  prior_phase text;
  expected_version integer;
  observed_events integer;
  observed_keys integer;
  latest_phase text;
  latest_version integer;
  decision record;
BEGIN
 FOR decision IN
  SELECT id,phase,row_version FROM review_stage.decisions
  WHERE id IN ('NFQ-NOM-101','NFQ-NOM-103','NFQ-NOM-104','NFQ-NOM-105')
 LOOP
  prior_phase:='draft';
  expected_version:=0;
  FOR entry IN
   SELECT action,previous_phase,next_phase,previous_version,next_version,
          actor_id,request_key
   FROM review_stage.events WHERE decision_id=decision.id
   ORDER BY previous_version
  LOOP
   IF entry.previous_version<>expected_version
      OR entry.next_version<>expected_version+1
      OR entry.previous_phase<>prior_phase
      OR entry.actor_id IS NULL OR entry.request_key='' THEN
    RAISE EXCEPTION 'Broken audit chain for % at %',decision.id,expected_version;
   END IF;
   IF entry.action='submitted' AND
     (entry.previous_phase<>'draft' OR entry.next_phase<>'under-review') THEN
    RAISE EXCEPTION 'Invalid submit transition %',decision.id;
   END IF;
   prior_phase:=entry.next_phase;
   expected_version:=entry.next_version;
  END LOOP;
  IF decision.row_version<>expected_version OR decision.phase<>prior_phase THEN
    RAISE EXCEPTION 'Audit tip differs from decision state %',decision.id;
  END IF;
  SELECT COUNT(*) INTO observed_events FROM review_stage.events WHERE decision_id=decision.id;
  SELECT COUNT(*) INTO observed_keys FROM review_stage.idempotency WHERE decision_id=decision.id;
  IF observed_events<>observed_keys OR observed_events<>decision.row_version THEN
    RAISE EXCEPTION 'Audit and idempotency gap for %',decision.id;
  END IF;
 END LOOP;

 -- An idempotency result must identify the SAME event, actor, version and
 -- decision as the immutable audit. The JSON response contains no secrets.
 IF EXISTS (
   SELECT 1 FROM review_stage.idempotency i JOIN review_stage.events e
   ON i.event_id=e.event_id
   WHERE i.actor_id<>e.actor_id OR i.decision_id<>e.decision_id
      OR i.request_key<>e.request_key OR
      (i.result->>'eventId')::uuid<>e.event_id OR
      (i.result->>'version')::integer<>e.next_version OR
      i.result->>'phase'<>e.next_phase
 ) THEN RAISE EXCEPTION 'Idempotent reply mismatches immutable event'; END IF;

 IF NOT EXISTS (
   SELECT 1 FROM review_stage.events
   WHERE decision_id='NFQ-NOM-101' AND action='released'
 ) THEN RAISE EXCEPTION 'Released fixture missing independent audit'; END IF;
END
$audit$;

-- A failed update or delete of any protected record cannot erase or revise
-- an auditable decision. Catch *only* the expected append-only SQLSTATE.
DO $immutable$
BEGIN
 BEGIN
  UPDATE review_stage.events SET reason='tampered'
   WHERE decision_id='NFQ-NOM-101';
  RAISE EXCEPTION 'Event update unexpectedly allowed';
 EXCEPTION WHEN sqlstate '55000' THEN NULL; END;
 BEGIN
  DELETE FROM review_stage.reviews WHERE decision_id='NFQ-NOM-101';
  RAISE EXCEPTION 'Review deletion unexpectedly allowed';
 EXCEPTION WHEN sqlstate '55000' THEN NULL; END;
 BEGIN
  DELETE FROM review_stage.idempotency WHERE decision_id='NFQ-NOM-101';
  RAISE EXCEPTION 'Idempotency deletion unexpectedly allowed';
 EXCEPTION WHEN sqlstate '55000' THEN NULL; END;
END
$immutable$;

-- Simulate a lost response and exact replay of the already committed release.
-- State, review count, audit and idempotency must not change.
SET ROLE nfq_review_executor;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
DO $retry$
DECLARE before_events integer;before_keys integer;after_events integer;after_keys integer;
 v jsonb;
BEGIN
 SELECT COUNT(*) INTO before_events FROM review_stage.events WHERE decision_id='NFQ-NOM-101';
 SELECT COUNT(*) INTO before_keys FROM review_stage.idempotency WHERE decision_id='NFQ-NOM-101';
 v:=review_stage.review_command('NFQ-NOM-101',1,3,'release',null,null,
   'release-example01','Staging-only release');
 IF v->>'phase'<>'released' OR (v->>'replayed')::boolean<>true THEN
   RAISE EXCEPTION 'Retry did not return committed result';
 END IF;
 SELECT COUNT(*) INTO after_events FROM review_stage.events WHERE decision_id='NFQ-NOM-101';
 SELECT COUNT(*) INTO after_keys FROM review_stage.idempotency WHERE decision_id='NFQ-NOM-101';
 IF before_events<>after_events OR before_keys<>after_keys THEN
   RAISE EXCEPTION 'Lost-response replay appended duplicate audit';
 END IF;
END
$retry$;
RESET ROLE;
SELECT '14G5C AUDIT CHAIN, IMMUTABILITY AND LOST-RESPONSE RECOVERY PASSED' AS result;
