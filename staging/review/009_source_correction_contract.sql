\set ON_ERROR_STOP on
BEGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE anon NOLOGIN;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.variants(id bigint PRIMARY KEY);
CREATE TABLE public.evidence_links(
 id bigint PRIMARY KEY, variant_id bigint NOT NULL REFERENCES public.variants(id),
 title text, type text, category text, journal text, year integer, doi text, pmid text
);
CREATE TABLE public.nfq_research_memberships(
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),
 role text NOT NULL, revoked_at timestamptz
);
INSERT INTO auth.users(id) VALUES
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222'),
 ('33333333-3333-4333-8333-333333333333');
INSERT INTO public.variants(id) VALUES(10);
INSERT INTO public.evidence_links(id,variant_id,title,year,doi)
 VALUES(20,10,'Original recorded citation',2021,'10.1000/original');
INSERT INTO public.nfq_research_memberships(user_id,role) VALUES
 ('11111111-1111-4111-8111-111111111111','contributor'),
 ('22222222-2222-4222-8222-222222222222','reviewer');
COMMIT;
\ir ../../supabase/proposed/14h105_source_correction_review.sql
-- Explicitly confirm no browser role can mutate private tables.
DO $test$ BEGIN
 IF has_table_privilege('authenticated','public.nfq_source_correction_proposals','INSERT')
 OR has_table_privilege('authenticated','public.nfq_source_correction_proposals','UPDATE')
 OR has_table_privilege('authenticated','public.nfq_source_correction_events','SELECT')
 OR has_table_privilege('anon','public.nfq_source_correction_proposals','SELECT') THEN
  RAISE EXCEPTION 'Unexpected direct browser access';
 END IF;
END $test$;
SET ROLE authenticated;
SET request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
DO $test$ BEGIN
 BEGIN
  PERFORM public.nfq_submit_source_correction(20,'title','Unauthorized claim','Scientifically grounded proposal rationale');
  RAISE EXCEPTION 'Unassigned user could submit';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
SET request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
DO $test$ DECLARE created bigint; BEGIN
 created:=public.nfq_submit_source_correction(20,'title','Corrected source title','Original source contains a different title');
 IF created<>1 THEN RAISE EXCEPTION 'Wrong submitted proposal id'; END IF;
 BEGIN
  PERFORM public.nfq_review_source_correction(created,'accepted','Contributor cannot review own work');
  RAISE EXCEPTION 'Contributor was allowed to review';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $test$;
SET request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
DO $test$ DECLARE own_id bigint; BEGIN
 own_id:=public.nfq_submit_source_correction(20,'year','2022','Publication year is incorrect in the source');
 BEGIN
  PERFORM public.nfq_review_source_correction(own_id,'accepted','I should not review my own proposal');
  RAISE EXCEPTION 'Self-review was allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
 PERFORM public.nfq_review_source_correction(1,'accepted','Independent assessment confirms the source correction');
 BEGIN
  PERFORM public.nfq_review_source_correction(1,'rejected','Attempt to change an already recorded decision');
  RAISE EXCEPTION 'Repeat review was allowed';
 EXCEPTION WHEN invalid_parameter_value THEN NULL;
 END;
END $test$;
RESET ROLE;
DO $test$ BEGIN
 IF (SELECT title FROM public.evidence_links WHERE id=20)<>'Original recorded citation'
 OR (SELECT status FROM public.nfq_source_correction_proposals WHERE id=1)<>'accepted'
 OR (SELECT count(*) FROM public.nfq_source_correction_events)<>3 THEN
  RAISE EXCEPTION 'Publication boundary or audit contract failed';
 END IF;
END $test$;
