-- ISOLATED PostgreSQL ONLY; fixture identities are not real JWT verification.
\set ON_ERROR_STOP on
\i staging/security/060_authenticated_contract.sql
\i staging/security/070_authenticated_catalog_gate.sql

DO $assert$ BEGIN
 IF (SELECT count(*) FROM information_schema.columns WHERE
   table_schema='public' AND table_name='nfq_public_variant_catalog')<>5
 THEN RAISE EXCEPTION 'Catalog has unexpected fields'; END IF;
 IF has_table_privilege('anon','public.nfq_public_variant_catalog','SELECT')
 THEN RAISE EXCEPTION 'Anonymous catalog browsing still enabled'; END IF;
 IF has_table_privilege('authenticated','public.variants','SELECT')
 THEN RAISE EXCEPTION 'Authenticated role can directly read base variants'; END IF;
END $assert$;

SET ROLE anon;
DO $denied$ BEGIN
  BEGIN
    PERFORM id FROM public.nfq_public_variant_catalog LIMIT 1;
    RAISE EXCEPTION 'anonymous_catalog_leak';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM clinician_note FROM public.variants LIMIT 1;
    RAISE EXCEPTION 'anonymous_base_table_leak';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $denied$;
RESET ROLE;

SET ROLE authenticated;
DO $allowed$
DECLARE catalog_count integer;
BEGIN
  SELECT count(*) INTO catalog_count FROM public.nfq_public_variant_catalog;
  IF catalog_count<>1 THEN
    RAISE EXCEPTION 'expected isolated catalog fixture missing';
  END IF;
  BEGIN
    PERFORM clinician_note FROM public.variants LIMIT 1;
    RAISE EXCEPTION 'authenticated_base_table_leak';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $allowed$;
RESET ROLE;

SELECT 'STAGING AUTHENTICATED CATALOG CONTRACT PASSED; JWT/RLS UNVERIFIED' AS status;
