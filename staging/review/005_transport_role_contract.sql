\set ON_ERROR_STOP on
-- 14G3: dedicated transport's NOINHERIT and SET LOCAL isolation in disposable CI.
-- Role is NOLOGIN in this fixture. Production provisioning needs private
-- credentials, independent approval, pooler compatibility and revocation plan.
CREATE ROLE nfq_review_transport NOLOGIN NOINHERIT NOCREATEDB NOCREATEROLE NOSUPERUSER NOBYPASSRLS;
GRANT nfq_review_executor TO nfq_review_transport WITH INHERIT FALSE, SET TRUE, ADMIN FALSE;

DO $priv$
BEGIN
 IF has_function_privilege('nfq_review_transport','review_stage.review_command(text,integer,integer,text,text,text,text,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Transport automatically inherited private review execution';
 END IF;
 IF has_table_privilege('nfq_review_transport','auth.sessions','SELECT') THEN
  RAISE EXCEPTION 'Transport automatically inherited Auth session reads';
 END IF;
 IF has_schema_privilege('nfq_review_transport','review_stage','USAGE') THEN
  RAISE EXCEPTION 'Transport automatically inherited review schema access';
 END IF;
 IF NOT pg_has_role('nfq_review_transport','nfq_review_executor','SET') THEN
  RAISE EXCEPTION 'Trusted transport cannot acquire scoped executor role';
 END IF;
 IF pg_has_role('nfq_review_transport','nfq_review_executor','USAGE') THEN
  RAISE EXCEPTION 'Privileged executor inherited rather than explicitly selected';
 END IF;
END
$priv$;

-- A non-superuser transport can only obtain executor privileges within
-- the explicit transaction; after COMMIT it must revert to NOINHERIT.
SET ROLE nfq_review_transport;
BEGIN;
SET LOCAL ROLE nfq_review_executor;
DO $scoped$
BEGIN
 IF current_user <> 'nfq_review_executor' THEN
  RAISE EXCEPTION 'Transaction does not run with dedicated executor';
 END IF;
 IF NOT has_column_privilege(current_user,'auth.sessions','not_after','SELECT') THEN
  RAISE EXCEPTION 'Session-check privileges missing in scoped transaction';
 END IF;
 IF NOT has_function_privilege(current_user,'review_stage.review_command(text,integer,integer,text,text,text,text,text)','EXECUTE') THEN
  RAISE EXCEPTION 'Scoped transaction cannot invoke private review';
 END IF;
END
$scoped$;
COMMIT;
DO $reset$
BEGIN
 IF current_user <> 'nfq_review_transport' THEN
  RAISE EXCEPTION 'Post-commit current_user retains privileged executor role';
 END IF;
 IF has_schema_privilege(current_user,'review_stage','USAGE') THEN
  RAISE EXCEPTION 'Private review schema leaked from prior transaction';
 END IF;
 IF coalesce(current_setting('request.jwt.claim.sub',true),'') <> '' THEN
  RAISE EXCEPTION 'Previous actor leaked from transaction';
 END IF;
END
$reset$;
RESET ROLE;
SELECT '14G3 DEDICATED TRANSPORT NOINHERIT AND LOCAL ROLE PASSED' AS result;
