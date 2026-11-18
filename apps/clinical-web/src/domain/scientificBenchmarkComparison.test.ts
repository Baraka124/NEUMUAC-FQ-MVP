import {describe,it,expect} from 'vitest';
import {compareExpertWithPlatform} from './scientificBenchmarkComparison';
import type {ExpertExtraction} from './expertBenchmarkAdjudication';
const a:ExpertExtraction={
 caseId:'phe508del-mf-eti-2019',variantId:'18',pmid:'31697873',
 reviewerId:'expert-alpha',submittedAt:'2026-11-18T10:00:00Z',
 sourceLocator:'Table 2, endpoint',genotypeContext:'Phe508del plus minimal-function',
 endpoint:'ppFEV1',modelOrCohort:'Randomized cohort',finding:'supports',
 claimId:null,methodNotes:'Independent reviewed source transcription'
};
const b={...a,reviewerId:'expert-beta',submittedAt:'2026-11-18T10:01:00Z'};
const run=(extracts:ExpertExtraction[],mapping?:any)=>compareExpertWithPlatform({
 caseId:a.caseId,variantId:a.variantId,references:[],claims:[],extracts,mapping
});
describe('14H201 scientific benchmark comparison (negative controls)',()=>{
 it('does not infer agreement from a PMID or bibliography alone',()=>{
  expect(run([a,b]).status).toBe('missing-source-claim');
  expect(run([a,b]).scientificAccuracyValidated).toBe(false);
 });
 it('requires two independent expert extractions',()=>{
  expect(run([a]).status).toBe('missing-expert-reviews');
 });
 it('fails closed on disagreement without adjudication',()=>{
  expect(run([a,{...b,finding:'does-not-support'}]).status).toBe('unresolved-disagreement');
 });
 it('rejects malformed purported mappings',()=>{
  expect(()=>run([a,b],{
   caseId:a.caseId,variantId:'19',platformClaimId:'claim-a',
   expertFinding:'supports',claimFinding:'reported-response',
   genotypeContext:a.genotypeContext,endpointCode:'ppFEV1',
   endpointTimepoint:'week-24',sourceLocator:a.sourceLocator,
   attestedBy:'expert-gamma',attestedAt:'2026-11-18T10:30:00Z',
   mappingVersion:1
  })).toThrow();
 });
 it('cannot reuse the expert as the independent mapping attestor',()=>{
  const result=run([a,b],{
   caseId:a.caseId,variantId:a.variantId,platformClaimId:'claim-a',
   expertFinding:'supports',claimFinding:'reported-response',
   genotypeContext:a.genotypeContext,endpointCode:'ppFEV1',
   endpointTimepoint:'week-24',sourceLocator:a.sourceLocator,
   attestedBy:'expert-alpha',attestedAt:'2026-11-18T10:30:00Z',
   mappingVersion:1
  });
  expect(result.status).toBe('incompatible-evidence');
 });
 it('does not claim scientific accuracy or clinical utility even for missing source claims',()=>{
  const result=run([a,b]);
  expect(result.scientificAccuracyValidated).toBe(false);
  expect(result.usableForClinicalDecision).toBe(false);
 });
});
