import {describe,it,expect} from 'vitest';
import {assessModulatorSourceColumns,legacyPredictionEvidenceStatus,REQUIRED_MODULATOR_PROVENANCE_COLUMNS} from './modulatorSourceReadiness';
describe('Phase 4B source readiness is deliberately fail-closed',()=>{
 it('blocks the actual legacy variant_evidence / evidence_sources column combination',()=>{
  const schema=['id','variant_id','source_id','cftr_class','eti_response','alyftrek_response',
   'sample_size','confidence','notes','created_at','source_key','display_name',
   'source_type','year','url','description','reliability_score','is_active'];
  const result=assessModulatorSourceColumns(schema);
  expect(result.state).toBe('blocked-missing-provenance');
  expect(result.missing).toContain('document_version');
  expect(result.missing).toContain('review_state');
  expect(result.scientificallyApproved).toBe(false);
 });
 it('does not imply approval even if a future schema supplies all columns',()=>{
  const result=assessModulatorSourceColumns(REQUIRED_MODULATOR_PROVENANCE_COLUMNS);
  expect(result.state).toBe('provenance-structure-present');
  expect(result.missing).toHaveLength(0);
  expect(result.scientificallyApproved).toBe(false);
  expect(result.readAuthorizationVerified).toBe(false);
 });
 it('never promotes ETI or Alyftrek legacy predictions to verified evidence',()=>{
  for(const raw of ['responsive','non_responsive','unknown',true,null,'eligible']){
   expect(legacyPredictionEvidenceStatus(raw)).toBe('not-verified-for-display');
  }
 });
});
