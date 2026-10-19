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
INSERT INTO auth.sessions(id,user_id,not_after) VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','00000000-0000-0000-0000-000000000003',now()+interval '1 hour'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','00000000-0000-0000-0000-000000000001',now()+interval '1 hour'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','00000000-0000-0000-0000-000000000002',now()+interval '1 hour'),
 ('ffffffff-ffff-4fff-8fff-ffffffffffff','00000000-0000-0000-0000-000000000009',now()+interval '1 hour');
-- Deliberately no persistent external setup: this disposable container is
-- destroyed by GitHub Actions after this job.
SELECT '14G5 PRIVATE LOOPBACK FIXTURE READY' AS result;
