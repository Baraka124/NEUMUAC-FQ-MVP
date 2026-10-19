\set ON_ERROR_STOP on
-- 14G3: isolated PostgreSQL session-revocation & transaction-local identity.
-- Run only after the other disposable staging review fixtures.
-- This verifies DB semantics, NOT a real Supabase-issued JWT.
CREATE TABLE auth.sessions (
 id uuid PRIMARY KEY,
 user_id uuid NOT NULL REFERENCES auth.users(id),
 not_after timestamptz
);
REVOKE ALL ON auth.sessions FROM PUBLIC,anon,authenticated,nfq_review_executor;
GRANT USAGE ON SCHEMA auth TO nfq_review_executor;
GRANT SELECT (id,user_id,not_after) ON auth.sessions TO nfq_review_executor;

INSERT INTO auth.sessions(id,user_id,not_after) VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','00000000-0000-0000-0000-000000000001',now()+interval '1 hour'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','00000000-0000-0000-0000-000000000002',now()-interval '1 hour');

DO $permissions$
BEGIN
 IF has_table_privilege('anon','auth.sessions','SELECT') OR
    has_table_privilege('authenticated','auth.sessions','SELECT') OR
    has_column_privilege('authenticated','auth.sessions','user_id','SELECT') OR
    NOT has_column_privilege('nfq_review_executor','auth.sessions','not_after','SELECT') THEN
    RAISE EXCEPTION 'Private active-session grant exposes browsers or blocks executor';
 END IF;
END
$permissions$;

-- The gateway's exact WHERE clause is tested as the dedicated executor.
BEGIN;
SET LOCAL ROLE nfq_review_executor;
DO $session$
DECLARE n integer;
BEGIN
 SELECT count(*) INTO n FROM auth.sessions
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
   AND user_id='00000000-0000-0000-0000-000000000001'::uuid
   AND (not_after IS NULL OR not_after>now());
 IF n<>1 THEN RAISE EXCEPTION 'Active same-owner session denied'; END IF;

 SELECT count(*) INTO n FROM auth.sessions
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
   AND user_id='00000000-0000-0000-0000-000000000002'::uuid
   AND (not_after IS NULL OR not_after>now());
 IF n<>0 THEN RAISE EXCEPTION 'Foreign session accepted'; END IF;

 SELECT count(*) INTO n FROM auth.sessions
 WHERE id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
   AND user_id='00000000-0000-0000-0000-000000000002'::uuid
   AND (not_after IS NULL OR not_after>now());
 IF n<>0 THEN RAISE EXCEPTION 'Expired session accepted'; END IF;
END
$session$;
COMMIT;

INSERT INTO review_stage.decisions(id,revision,kind,proposer_id,evidence_hash,ruleset_hash)
VALUES ('NFQ-NOM-105',1,'alias-equivalence','00000000-0000-0000-0000-000000000001',repeat('a',64),repeat('b',64));
INSERT INTO review_stage.evidence_checks(decision_id,revision,evidence_hash,verified_by)
VALUES ('NFQ-NOM-105',1,repeat('a',64),'00000000-0000-0000-0000-000000000009');

-- Match the server bridge transaction: role and actor bound locally, with
-- active session checked before the private review mutation.
BEGIN;
SET LOCAL ROLE nfq_review_executor;
SELECT 1 FROM auth.sessions
 WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
   AND user_id='00000000-0000-0000-0000-000000000001'::uuid
   AND (not_after IS NULL OR not_after>now());
SELECT set_config('request.jwt.claim.sub',
 '00000000-0000-0000-0000-000000000001',true);
SELECT review_stage.review_command('NFQ-NOM-105',1,0,'submit',null,null,
 'active-session01','Evidence-backed proposal with current session');
COMMIT;

DO $post$
BEGIN
 IF current_user<>'postgres' THEN RAISE EXCEPTION 'Executor role escaped its transaction'; END IF;
 IF coalesce(current_setting('request.jwt.claim.sub',true),'')<>'' THEN
  RAISE EXCEPTION 'A prior user identity leaked after transaction';
 END IF;
 IF (SELECT row_version FROM review_stage.decisions WHERE id='NFQ-NOM-105')<>1 OR
    (SELECT count(*) FROM review_stage.events WHERE decision_id='NFQ-NOM-105')<>1 THEN
  RAISE EXCEPTION 'Active session did not produce one atomic state and audit';
 END IF;
END
$post$;

-- Revocation removes the row: the bridge predicate no longer finds a match,
-- even if an old bearer token might still be syntactically valid.
DELETE FROM auth.sessions WHERE id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
BEGIN;
SET LOCAL ROLE nfq_review_executor;
DO $revoked$
BEGIN
 IF EXISTS (
  SELECT 1 FROM auth.sessions WHERE
   id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
   AND user_id='00000000-0000-0000-0000-000000000001'::uuid
   AND (not_after IS NULL OR not_after>now())
 ) THEN RAISE EXCEPTION 'Revoked session still accepted'; END IF;
END
$revoked$;
COMMIT;
SELECT '14G3 PRIVATE SESSION CHECK AND CONTEXT ISOLATION PASSED' AS result;
