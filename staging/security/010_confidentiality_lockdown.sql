-- PHASE 2K-S / STEP A -- REVIEW REQUIRED, NOT PRODUCTION-APPLIED.
-- Confidentiality lockdown for sensitive legacy Supabase tables.
-- Intentionally stored outside supabase/migrations and all automatic deployments.
-- Explicitly breaks legacy analytics/audit/Helios browser-side read/write
-- flows. Do not deploy until replacements and rollback plans are approved.
BEGIN;
DO $check$
DECLARE v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY[
    'api_keys','app_config','api_usage_logs','search_logs','search_miss_queue',
    'search_history_log','audit_log','validation_history','variant_notes',
    'helios_pending_review','helios_audit_log','helios_feedback'
  ] LOOP
    IF to_regclass('public.' || quote_ident(v_name)) IS NULL THEN
      RAISE EXCEPTION '2K-S schema drift: expected public.% table absent', v_name;
    END IF;
    IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid=to_regclass('public.' || quote_ident(v_name))) THEN
      RAISE EXCEPTION '2K-S schema drift: expected RLS on public.%',v_name;
    END IF;
  END LOOP;
  IF to_regprocedure('public.check_write_pin(text)') IS NULL OR
     to_regprocedure('public.set_write_pin(text)') IS NULL THEN
     RAISE EXCEPTION '2K-S PIN function inventory drift';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='api_keys'
    AND policyname='anon_read_api_keys' AND cmd='SELECT' AND qual='true') THEN
    RAISE EXCEPTION '2K-S policy drift: api_keys baseline unexpected';
  END IF;
END $check$;

-- Remove policies that currently advertise unrestricted browser access.
DROP POLICY IF EXISTS anon_read_api_keys ON public.api_keys;
DROP POLICY IF EXISTS anon_read_app_config ON public.app_config;
DROP POLICY IF EXISTS anon_insert_api_usage ON public.api_usage_logs;
DROP POLICY IF EXISTS auth_read_api_usage ON public.api_usage_logs;
DROP POLICY IF EXISTS anon_insert_search_logs ON public.search_logs;
DROP POLICY IF EXISTS anon_read_search_logs ON public.search_logs;
DROP POLICY IF EXISTS anon_insert_miss_queue ON public.search_miss_queue;
DROP POLICY IF EXISTS anon_select_miss_queue ON public.search_miss_queue;
DROP POLICY IF EXISTS anon_update_miss_queue ON public.search_miss_queue;
DROP POLICY IF EXISTS anon_all_search_history_log ON public.search_history_log;
DROP POLICY IF EXISTS anon_insert_audit_log ON public.audit_log;
DROP POLICY IF EXISTS anon_read_audit_log ON public.audit_log;
DROP POLICY IF EXISTS anon_insert_validation_history ON public.validation_history;
DROP POLICY IF EXISTS anon_select_validation_history ON public.validation_history;
DROP POLICY IF EXISTS anon_all_variant_notes ON public.variant_notes;
DROP POLICY IF EXISTS anon_insert_helios_pending ON public.helios_pending_review;
DROP POLICY IF EXISTS anon_select_helios_pending ON public.helios_pending_review;
DROP POLICY IF EXISTS anon_update_helios_pending ON public.helios_pending_review;
DROP POLICY IF EXISTS anon_insert_helios_audit ON public.helios_audit_log;
DROP POLICY IF EXISTS anon_select_helios_audit ON public.helios_audit_log;
DROP POLICY IF EXISTS anon_all_helios_feedback ON public.helios_feedback;

-- Grants and RLS are both required for access; revoke both browser roles.
REVOKE ALL ON TABLE
  public.api_keys,public.app_config,public.api_usage_logs,
  public.search_logs,public.search_miss_queue,public.search_history_log,
  public.audit_log,public.validation_history,public.variant_notes,
  public.helios_pending_review,public.helios_audit_log,public.helios_feedback
FROM anon, authenticated;

-- PostgreSQL functions often inherit PUBLIC EXECUTE by default.
REVOKE ALL ON FUNCTION public.check_write_pin(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.set_write_pin(text) FROM PUBLIC,anon,authenticated;
COMMIT;
