\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.variants (
 id bigint PRIMARY KEY, legacy_name text, protein_name text, cdna_name text,
 alt_names text, clinician_note text, field_provenance jsonb);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.variants TO anon,authenticated;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY variants_read ON public.variants FOR SELECT TO anon,authenticated USING(true);
INSERT INTO public.variants VALUES(101,'F508del','p.Phe508del','c.1521_1523delCTT','DF508','private clinical note','{"confidential":true}');
\i staging/security/040_public_variant_catalog.sql
-- Public catalog contains exactly 5 columns; no underlying table read privilege.
DO $check$
BEGIN
 IF (SELECT count(*) FROM information_schema.columns WHERE
 table_schema='public' AND table_name='nfq_public_variant_catalog')<>5
 THEN RAISE EXCEPTION 'Public view projection changed'; END IF;
 IF has_table_privilege('anon','public.variants','SELECT')
 OR has_table_privilege('authenticated','public.variants','SELECT')
 THEN RAISE EXCEPTION 'Underlying variant table is still selectable'; END IF;
END $check$;
SET ROLE anon;
SELECT id,legacy_name,protein_name,cdna_name,alt_names FROM public.nfq_public_variant_catalog;
DO $negative$ BEGIN
 BEGIN PERFORM clinician_note FROM public.variants;
 RAISE EXCEPTION 'private clinician note leaked';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END $negative$;
RESET ROLE;
\i staging/security/050_authenticated_clinical_operations.sql
INSERT INTO nfq_clinical.role_grants(actor_id,role_name) VALUES
 ('00000000-0000-0000-0000-000000000011','clinician'),
 ('00000000-0000-0000-0000-000000000012','reviewer');
INSERT INTO nfq_clinical.review_decisions(review_id,variant_id) VALUES(200,101);
SET ROLE anon;
DO $negative$ BEGIN
 BEGIN PERFORM public.nfq_stage_clinical_command('add-note',101,null,null,'hello',null,'anonymous-test1');
 RAISE EXCEPTION 'anon command executable';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END $negative$;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000011';
SELECT public.nfq_stage_clinical_command('add-note',101,null,null,'Reviewed nonclinical fixture',null,'note-request-0001');
SELECT public.nfq_stage_clinical_command('add-note',101,null,null,'Reviewed nonclinical fixture',null,'note-request-0001');
DO $negative$ BEGIN
 BEGIN PERFORM public.nfq_stage_clinical_command('decide-review',101,200,0,null,'approved','bad-role-test01');
 RAISE EXCEPTION 'unapproved reviewer passed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 END $negative$;
RESET ROLE;
SET ROLE authenticated;
SET request.jwt.claim.sub='00000000-0000-0000-0000-000000000012';
SELECT public.nfq_stage_clinical_command('decide-review',101,200,0,null,'approved','review-request01');
DO $negative$ BEGIN
 BEGIN PERFORM public.nfq_stage_clinical_command('decide-review',101,200,0,null,'rejected','stale-review-01');
 RAISE EXCEPTION 'stale review accepted';
 EXCEPTION WHEN sqlstate '40001' THEN NULL; END;
 END $negative$;
RESET ROLE;
DO $assert$ BEGIN
 IF (SELECT count(*) FROM nfq_clinical.notes)<>1 THEN RAISE EXCEPTION 'duplicate note'; END IF;
 IF (SELECT count(*) FROM nfq_clinical.operation_events)<>2 THEN RAISE EXCEPTION 'unexpected events'; END IF;
 IF (SELECT status FROM nfq_clinical.review_decisions WHERE review_id=200)<>'approved'
 THEN RAISE EXCEPTION 'review not approved'; END IF;
 END $assert$;
SELECT 'PHASE 2K-T CONTRACT PASSED' AS status;
