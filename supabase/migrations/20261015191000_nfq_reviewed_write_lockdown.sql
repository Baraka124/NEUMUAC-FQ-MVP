-- Apply only after verifying the owner's account, bootstrapping its administrator
-- membership through a privileged maintenance session, and testing on staging.
-- Public SELECT policies are intentionally untouched.
-- No scientific data rows are modified.
BEGIN;
-- Eliminate blanket mutations on research records.
DROP POLICY IF EXISTS variants_write ON public.variants;
DROP POLICY IF EXISTS variants_update ON public.variants;
DROP POLICY IF EXISTS anon_insert_evidence_links ON public.evidence_links;
DROP POLICY IF EXISTS variant_evidence_write ON public.variant_evidence;
DROP POLICY IF EXISTS allow_insert_evd ON public.external_variant_data;
DROP POLICY IF EXISTS allow_update_evd ON public.external_variant_data;
DROP POLICY IF EXISTS anon_insert_validation_history ON public.validation_history;
DROP POLICY IF EXISTS anon_all_variant_notes ON public.variant_notes;
DROP POLICY IF EXISTS anon_insert_archive ON public.cftr_variants_archive;
DROP POLICY IF EXISTS anon_insert_contradictions ON public.contradictions;
DROP POLICY IF EXISTS anon_update_contradictions ON public.contradictions;
DROP POLICY IF EXISTS anon_insert_research_gaps ON public.research_gaps;
DROP POLICY IF EXISTS anon_upsert_research_gaps ON public.research_gaps;
DROP POLICY IF EXISTS anon_insert_helios_pending ON public.helios_pending_review;
DROP POLICY IF EXISTS anon_update_helios_pending ON public.helios_pending_review;
DROP POLICY IF EXISTS anon_insert_helios_audit ON public.helios_audit_log;
DROP POLICY IF EXISTS anon_insert_bot_runs ON public.helios_bot_runs;
DROP POLICY IF EXISTS anon_update_bot_runs ON public.helios_bot_runs;
DROP POLICY IF EXISTS anon_all_helios_feedback ON public.helios_feedback;
DROP POLICY IF EXISTS anon_all_platform_snapshots ON public.platform_snapshots;
DROP POLICY IF EXISTS anon_all_search_history_log ON public.search_history_log;
DROP POLICY IF EXISTS anon_update_institutions ON public.institutions;
DROP POLICY IF EXISTS anon_insert_institutions ON public.institutions;
DROP POLICY IF EXISTS allow_insert_rf ON public.reach_forecasts;
DROP POLICY IF EXISTS anon_update_miss_queue ON public.search_miss_queue;
DROP POLICY IF EXISTS anon_insert_miss_queue ON public.search_miss_queue;
DROP POLICY IF EXISTS anon_insert_audit_log ON public.audit_log;
-- Remove API table grants for scientific and reviewer-controlled writes.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
 public.variants,public.variant_evidence,public.evidence_links,
 public.evidence_sources,public.drug_jurisdiction_rules,public.cftr_class_rules,
 public.validation_history,public.variant_notes,public.external_variant_data,
 public.contradictions,public.research_gaps,public.cftr_variants_archive,
 public.helios_pending_review,public.helios_audit_log,public.helios_bot_runs,
 public.helios_feedback,public.platform_snapshots,public.search_history_log,
 public.institutions,public.reach_forecasts,public.search_miss_queue,
 public.audit_log
FROM anon, authenticated;
-- Preserve separately reviewed public telemetry policies for now.
COMMIT;
