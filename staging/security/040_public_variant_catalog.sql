-- NEUMUACFQ PHASE 2K-T / STAGING ONLY -- NEVER AUTO-APPLIED
-- Prerequisite: 2K-S confidential-read and clinical-write lockdown;
-- requires specific owner validation, a tested rollback, and explicit approval.
-- PostgreSQL view is INTENTIONALLY a restricted, definer-privileged projection.
-- Review institution licensing and whether each public field can be exposed.
BEGIN;

DO $validate$
BEGIN
 IF to_regclass('public.variants') IS NULL THEN RAISE EXCEPTION 'variants table not present'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies
     WHERE schemaname='public' AND tablename='variants'
       AND policyname='variants_read' AND cmd='SELECT') THEN
   RAISE EXCEPTION 'Expected variant SELECT policy absent';
 END IF;
 IF EXISTS (
  SELECT 1 FROM (VALUES ('id'),('legacy_name'),('protein_name'),('cdna_name'),('alt_names')) AS cols(col)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE
    c.table_schema='public' AND c.table_name='variants' AND c.column_name=cols.col)
 ) THEN RAISE EXCEPTION 'Variant nomenclature columns changed'; END IF;
END $validate$;

-- View owner (schema owner) performs the underlying SELECT. Callers are
-- granted access only to this five-column catalog, not the original table.
-- This is purposefully NOT security_invoker: invoker access would require
-- reopening the base-table privileges that we intend to close.
CREATE OR REPLACE VIEW public.nfq_public_variant_catalog
WITH (security_barrier=true, security_invoker=false)
AS SELECT id, legacy_name, protein_name, cdna_name, alt_names
FROM public.variants;

REVOKE ALL ON TABLE public.nfq_public_variant_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.nfq_public_variant_catalog TO anon, authenticated;

-- Must not be run until every existing direct legacy variants SELECT has
-- been migrated. Data and table definitions remain untouched by this script.
REVOKE SELECT ON TABLE public.variants FROM anon, authenticated;

-- Fail instead of shipping if additional column-level grants expose a hidden
-- clinical/provenance column after the table grant has been revoked.
DO $gate$
DECLARE col_name text;
BEGIN
 IF has_table_privilege('anon','public.variants','SELECT')
 OR has_table_privilege('authenticated','public.variants','SELECT') THEN
   RAISE EXCEPTION 'Base variants table still readable by browser roles';
 END IF;
 FOR col_name IN SELECT attname FROM pg_attribute
  WHERE attrelid='public.variants'::regclass AND attnum>0 AND NOT attisdropped
 LOOP
   IF has_column_privilege('anon','public.variants',col_name,'SELECT')
   OR has_column_privilege('authenticated','public.variants',col_name,'SELECT')
   THEN RAISE EXCEPTION 'Column-level grant still exposes public.variants.%; review grants',col_name;
   END IF;
 END LOOP;
END $gate$;
COMMIT;
