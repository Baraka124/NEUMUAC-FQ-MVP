\set ON_ERROR_STOP on
-- Runs after staging/review/002–005 on a disposable postgres:17 container.
-- Required for actual TCP connections as a non-inheriting transport identity.
DO $guard$
BEGIN
 IF current_database() <> 'review_test'
 OR current_setting('listen_addresses') IS NULL THEN
  RAISE EXCEPTION 'Refuse CI transport fixture outside review_test';
 END IF;
END $guard$;
ALTER ROLE nfq_review_transport LOGIN PASSWORD 'ci-disposable-only';
-- RFC-4122-shaped CI-only identities: actual HTTP validation rejects the
-- legacy zero-version UUID placeholders used by the original SQL-only tests.
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111113'),
 ('11111111-1111-4111-8111-111111111111'),
 ('11111111-1111-4111-8111-111111111112'),
 ('11111111-1111-4111-8111-111111111119');
INSERT INTO public.nfq_research_memberships(user_id,role,granted_by,revoked_at) VALUES
 ('11111111-1111-4111-8111-111111111113','reviewer','00000000-0000-0000-0000-000000000009',null),
 ('11111111-1111-4111-8111-111111111111','contributor','00000000-0000-0000-0000-000000000009',null),
 ('11111111-1111-4111-8111-111111111112','reviewer' ,'00000000-0000-0000-0000-000000000009',now());
INSERT INTO review_stage.actor_grants(actor_id,role_name,granted_by) VALUES
 ('11111111-1111-4111-8111-111111111113','engineering','11111111-1111-4111-8111-111111111119'),
 ('11111111-1111-4111-8111-111111111112','scientific','11111111-1111-4111-8111-111111111119');

INSERT INTO auth.sessions(id,user_id,not_after) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','11111111-1111-4111-8111-111111111113',now()+interval '1 hour'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','11111111-1111-4111-8111-111111111111',now()+interval '1 hour'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','11111111-1111-4111-8111-111111111112',now()+interval '1 hour'),
 ('ffffffff-ffff-4fff-8fff-ffffffffffff' ,'00000000-0000-0000-0000-000000000009',now()+interval '1 hour');
-- Deliberately no persistent external setup: this disposable container is
-- destroyed by GitHub Actions after this job.
SELECT '14G5 PRIVATE LOOPBACK FIXTURE READY' AS result;
