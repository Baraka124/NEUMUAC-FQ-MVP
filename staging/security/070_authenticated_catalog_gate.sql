-- PHASE 2M-C: DISPOSABLE STAGING ONLY. DO NOT RUN ON PRODUCTION.
-- This adds an authenticated-role gate atop 040. It does not prove
-- entitlement of every signed-in account or per-row scientific clearance.
-- 040 creates a SECURITY DEFINER view: the underlying variants RLS does
-- NOT necessarily apply to this projection. Independent data-owner review
-- is required before publishing any production rows.
BEGIN;
DO $prerequisite$
BEGIN
  IF to_regclass('public.nfq_public_variant_catalog') IS NULL THEN
    RAISE EXCEPTION '2M-C: expected staged restricted catalog is absent';
  END IF;
  IF to_regclass('public.variants') IS NULL THEN
    RAISE EXCEPTION '2M-C: original variants table is absent';
  END IF;
  IF (SELECT count(*) FROM information_schema.columns c
      WHERE c.table_schema='public' AND c.table_name='nfq_public_variant_catalog')<>5
    THEN RAISE EXCEPTION '2M-C: catalog projection width drift'; END IF;
END $prerequisite$;
-- Do not allow anonymous browsing or fallbacks via the table or the view.
REVOKE ALL ON TABLE public.nfq_public_variant_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.nfq_public_variant_catalog TO authenticated;
-- Guard against inadvertently restoring direct base-table reads.
REVOKE SELECT ON TABLE public.variants FROM anon, authenticated;
DO $permissions$
BEGIN
  IF has_table_privilege('anon','public.nfq_public_variant_catalog','SELECT') OR
     has_table_privilege('anon','public.variants','SELECT') OR
     has_table_privilege('authenticated','public.variants','SELECT')
    THEN RAISE EXCEPTION '2M-C: anonymous or base table SELECT remains reachable'; END IF;
  IF NOT has_table_privilege('authenticated','public.nfq_public_variant_catalog','SELECT')
    THEN RAISE EXCEPTION '2M-C: authorized role catalog SELECT missing'; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns c
             WHERE c.table_schema='public' AND c.table_name='nfq_public_variant_catalog'
             AND c.column_name NOT IN ('id','legacy_name','protein_name','cdna_name','alt_names'))
    THEN RAISE EXCEPTION '2M-C: unreviewed catalog field exposed'; END IF;
END $permissions$;
COMMIT;
