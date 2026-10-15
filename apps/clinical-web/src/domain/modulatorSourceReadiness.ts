/**
 * NFQ-015 / NFQ-026 — fail-closed Phase 4B source readiness gate.
 *
 * Checks STRUCTURAL provenance only. This function does not read a database,
 * endorse an evidence source, validate a scientific finding or authorize UI use.
 */
export const REQUIRED_MODULATOR_PROVENANCE_COLUMNS = [
 'document_url','document_version','published_on','retrieved_on',
 'location_in_document','evidence_method','jurisdiction','review_state'
] as const;

export type RequiredModulatorColumn = typeof REQUIRED_MODULATOR_PROVENANCE_COLUMNS[number];
export interface SourceReadiness {
 readonly state:'blocked-missing-provenance'|'provenance-structure-present';
 readonly missing:readonly RequiredModulatorColumn[];
 readonly scientificallyApproved:false;
 readonly readAuthorizationVerified:false;
}
export function assessModulatorSourceColumns(columns:readonly string[]):SourceReadiness {
 const names=new Set(columns.map(x=>x.toLowerCase().trim()));
 const missing=REQUIRED_MODULATOR_PROVENANCE_COLUMNS.filter(x=>!names.has(x));
 return Object.freeze({
  state:missing.length?'blocked-missing-provenance':'provenance-structure-present',
  missing:Object.freeze(missing),
  // Even complete column names do not substitute for real record/source review or RLS checks.
  scientificallyApproved:false,
  readAuthorizationVerified:false
 });
}

/** Explicitly forbidden shortcut: a legacy variant prediction is NOT source evidence.
 * This guard has no fall-through to "responsive", "eligible" or "no response".
 */
export function legacyPredictionEvidenceStatus(value:unknown):
 'not-verified-for-display' {
 void value;
 return 'not-verified-for-display';
}
