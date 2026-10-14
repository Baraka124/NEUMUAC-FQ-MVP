\set ON_ERROR_STOP on
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA IF NOT EXISTS public;
CREATE TABLE public.variants(id bigint PRIMARY KEY,legacy_name text,clinician_note text);
CREATE TABLE public.evidence_links(id bigint PRIMARY KEY);
CREATE TABLE public.variant_evidence(id bigint PRIMARY KEY);
CREATE TABLE public.platform_snapshots(id bigint PRIMARY KEY);
CREATE TABLE public.api_keys(id bigint PRIMARY KEY,key text);
CREATE TABLE public.app_config(key text PRIMARY KEY,value text);
CREATE TABLE public.api_usage_logs(id bigint PRIMARY KEY);
CREATE TABLE public.search_logs(id bigint PRIMARY KEY);
CREATE TABLE public.search_miss_queue(id bigint PRIMARY KEY);
CREATE TABLE public.search_history_log(id bigint PRIMARY KEY);
CREATE TABLE public.audit_log(id bigint PRIMARY KEY);
CREATE TABLE public.validation_history(id bigint PRIMARY KEY);
CREATE TABLE public.variant_notes(id bigint PRIMARY KEY);
CREATE TABLE public.helios_pending_review(id bigint PRIMARY KEY);
CREATE TABLE public.helios_audit_log(id bigint PRIMARY KEY);
CREATE TABLE public.helios_feedback(id bigint PRIMARY KEY);
CREATE FUNCTION public.check_write_pin(p_pin text) RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$SELECT true$$;
CREATE FUNCTION public.set_write_pin(p_pin text) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$SELECT$$;
DO $create$
DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['variants','evidence_links','variant_evidence','platform_snapshots','api_keys','app_config','api_usage_logs','search_logs','search_miss_queue','search_history_log','audit_log','validation_history','variant_notes','helios_pending_review','helios_audit_log','helios_feedback'] LOOP
EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
EXECUTE format('GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.%I TO anon,authenticated',t);
END LOOP;
END $create$;
CREATE POLICY variants_read ON public.variants FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY variants_update ON public.variants FOR UPDATE TO anon,authenticated USING (true) WITH CHECK(true);
CREATE POLICY variants_write ON public.variants FOR INSERT TO anon,authenticated WITH CHECK(true);
CREATE POLICY anon_insert_evidence_links ON public.evidence_links FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY variant_evidence_write ON public.variant_evidence FOR ALL TO authenticated USING (true) WITH CHECK(true);
CREATE POLICY anon_all_platform_snapshots ON public.platform_snapshots FOR ALL TO anon,authenticated USING (true) WITH CHECK(true);
CREATE POLICY anon_read_api_keys ON public.api_keys FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY anon_read_app_config ON public.app_config FOR SELECT TO anon USING (true);
CREATE POLICY anon_insert_api_usage ON public.api_usage_logs FOR INSERT TO anon,authenticated WITH CHECK(true);
CREATE POLICY auth_read_api_usage ON public.api_usage_logs FOR SELECT TO authenticated USING(true);
CREATE POLICY anon_insert_search_logs ON public.search_logs FOR INSERT TO anon,authenticated WITH CHECK(true);
CREATE POLICY anon_read_search_logs ON public.search_logs FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY anon_insert_miss_queue ON public.search_miss_queue FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY anon_select_miss_queue ON public.search_miss_queue FOR SELECT TO anon USING(true);
CREATE POLICY anon_update_miss_queue ON public.search_miss_queue FOR UPDATE TO anon USING(true);
CREATE POLICY anon_all_search_history_log ON public.search_history_log FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
CREATE POLICY anon_insert_audit_log ON public.audit_log FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY anon_read_audit_log ON public.audit_log FOR SELECT TO anon USING(true);
CREATE POLICY anon_insert_validation_history ON public.validation_history FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY anon_select_validation_history ON public.validation_history FOR SELECT TO anon USING(true);
CREATE POLICY anon_all_variant_notes ON public.variant_notes FOR ALL TO anon USING(true) WITH CHECK(true);
CREATE POLICY anon_insert_helios_pending ON public.helios_pending_review FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY anon_select_helios_pending ON public.helios_pending_review FOR SELECT TO anon USING(true);
CREATE POLICY anon_update_helios_pending ON public.helios_pending_review FOR UPDATE TO anon USING(true);
CREATE POLICY anon_insert_helios_audit ON public.helios_audit_log FOR INSERT TO anon WITH CHECK(true);
CREATE POLICY anon_select_helios_audit ON public.helios_audit_log FOR SELECT TO anon USING(true);
CREATE POLICY anon_all_helios_feedback ON public.helios_feedback FOR ALL TO anon USING(true) WITH CHECK(true);

\i staging/security/010_confidentiality_lockdown.sql
\i staging/security/020_clinical_write_lockdown.sql

DO $assert$
DECLARE t text; v text;
BEGIN
FOREACH t IN ARRAY ARRAY['api_keys','app_config','api_usage_logs','search_logs','search_miss_queue','search_history_log','audit_log','validation_history','variant_notes','helios_pending_review','helios_audit_log','helios_feedback'] LOOP
  IF has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('anon','public.'||t,'INSERT') OR has_table_privilege('anon','public.'||t,'UPDATE') OR
     has_table_privilege('authenticated','public.'||t,'SELECT') OR has_table_privilege('authenticated','public.'||t,'INSERT') THEN
     RAISE EXCEPTION 'Sensitive permissions remain on %',t; END IF;
END LOOP;
IF has_function_privilege('anon','public.set_write_pin(text)','EXECUTE') OR has_function_privilege('anon','public.check_write_pin(text)','EXECUTE') OR
has_function_privilege('PUBLIC','public.set_write_pin(text)','EXECUTE') THEN
RAISE EXCEPTION 'Public PIN functions still executable'; END IF;
IF NOT has_table_privilege('anon','public.variants','SELECT') OR NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='variants' AND policyname='variants_read') THEN
RAISE EXCEPTION 'Public variant lookup unexpectedly removed'; END IF;
FOREACH t IN ARRAY ARRAY['variants','evidence_links','variant_evidence','platform_snapshots'] LOOP
 IF has_table_privilege('anon','public.'||t,'INSERT') OR has_table_privilege('anon','public.'||t,'UPDATE') OR
 has_table_privilege('authenticated','public.'||t,'UPDATE') THEN RAISE EXCEPTION 'Unsafe writes remain on %',t; END IF;
END LOOP;
END $assert$;

SET ROLE anon;
SELECT count(*) FROM public.variants;
DO $negative$
BEGIN
  BEGIN INSERT INTO public.variants(id,legacy_name) VALUES (1,'bad');
  RAISE EXCEPTION 'Anonymous variant INSERT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN PERFORM count(*) FROM public.api_keys;
  RAISE EXCEPTION 'Anonymous api_keys SELECT succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $negative$;
RESET ROLE;
SELECT 'PHASE 2K-S STAGING CONTRACT PASSED' AS status;
