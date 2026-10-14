-- PHASE 2K-S / STEP B -- not executable in production without sign-off.
-- Stop anonymous clinical writes while retaining approved public variant lookup.
BEGIN;
DO $check$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND
 tablename='variants' AND policyname='variants_read' AND cmd='SELECT' AND qual='true')
 THEN RAISE EXCEPTION 'variants SELECT baseline changed'; END IF;
 IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND
 tablename='variants' AND policyname='variants_update' AND cmd='UPDATE' AND qual='true')
 THEN RAISE EXCEPTION 'variants UPDATE baseline changed'; END IF;
END $check$;

-- Current unrestricted policies were discovered on production during the audit.
DROP POLICY IF EXISTS variants_update ON public.variants;
DROP POLICY IF EXISTS variants_write ON public.variants;
DROP POLICY IF EXISTS anon_insert_evidence_links ON public.evidence_links;
DROP POLICY IF EXISTS variant_evidence_write ON public.variant_evidence;
DROP POLICY IF EXISTS anon_all_platform_snapshots ON public.platform_snapshots;

-- Deliberately do NOT create new authenticated write permissions. Clinical
-- writes require independently verified user roles and transactional API.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
 public.variants, public.evidence_links, public.variant_evidence,
 public.platform_snapshots FROM anon, authenticated;

-- Read policies on variants and evidence remain as-is, subject to independent
-- column-level privacy review and later transition to an explicit view.
COMMIT;
