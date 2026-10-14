\set ON_ERROR_STOP on
-- Disposable PostgreSQL test with a minimal mock of auth.uid() semantics.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
 SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');
\i staging/security/120_verified_research_memberships.sql
INSERT INTO public.nfq_research_memberships(user_id,role,granted_by) VALUES
 ('11111111-1111-4111-8111-111111111111','contributor','22222222-2222-4222-8222-222222222222'),
 ('22222222-2222-4222-8222-222222222222','reviewer','11111111-1111-4111-8111-111111111111');
SET ROLE authenticated;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $test$
DECLARE c integer; v text;
BEGIN
 SELECT count(*) INTO c FROM public.nfq_research_memberships;
 IF c<>1 THEN RAISE EXCEPTION 'Authenticated viewer can read another identity'; END IF;
 SELECT role INTO v FROM public.nfq_research_memberships;
 IF v<>'contributor' THEN RAISE EXCEPTION 'Wrong role exposed'; END IF;
 BEGIN
   PERFORM user_id FROM public.nfq_research_memberships;
   RAISE EXCEPTION 'Identity column unexpectedly readable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   UPDATE public.nfq_research_memberships SET role='administrator';
   RAISE EXCEPTION 'Self-promotion unexpectedly writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   INSERT INTO public.nfq_research_memberships(user_id,role)
   VALUES ('11111111-1111-4111-8111-111111111111','administrator');
   RAISE EXCEPTION 'Self-insert unexpectedly writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN
   DELETE FROM public.nfq_research_memberships;
   RAISE EXCEPTION 'Self-delete unexpectedly writable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
DO $test$
BEGIN
 IF (SELECT count(*) FROM public.nfq_research_memberships)<>0 THEN
  RAISE EXCEPTION 'Unassigned user can see another role';
 END IF;
END $test$;
RESET ROLE;
SET ROLE anon;
DO $test$
BEGIN
 BEGIN
  PERFORM role FROM public.nfq_research_memberships;
  RAISE EXCEPTION 'Anonymous read unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $test$;
RESET ROLE;
SELECT 'MEMBERSHIP PRIVILEGES AND RLS PASSED' AS result;
