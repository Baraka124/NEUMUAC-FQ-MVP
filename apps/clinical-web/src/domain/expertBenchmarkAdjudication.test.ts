import {describe,it,expect} from 'vitest';
import {evaluateExpertBenchmark,type ExpertExtraction} from './expertBenchmarkAdjudication';

const record:ExpertExtraction={
 caseId:'phe508del-mf-eti-2019',variantId:'18',pmid:'31697873',
 reviewerId:'expert-alpha',submittedAt:'2026-11-18T10:00:00Z',
 sourceLocator:'Table 2, primary outcome',genotypeContext:'Phe508del/minimal-function',
 endpoint:'ppFEV1 change',modelOrCohort:'randomized clinical cohort',
 finding:'inconclusive',claimId:null,
 methodNotes:'Independent human transcription with source locator'
};
const second:ExpertExtraction={...record,reviewerId:'expert-beta',submittedAt:'2026-11-18T10:01:00Z'};
const input=(extracts:ExpertExtraction[],adjudication?:any)=>({
 caseId:record.caseId,variantId:record.variantId,references:[],claims:[],extracts,adjudication
});
describe('14H198–199 independent expert evidence benchmark: fail-closed boundaries',()=>{
 it('requires two independent scientific extracts',()=>{
  const result=evaluateExpertBenchmark(input([record]));
  expect(result.disposition).toBe('awaiting-experts');
  expect(result.independentlyValidated).toBe(false);
  expect(result.clinicalDecision).toBe(false);
 });
 it('rejects reused identities, wrong publication and incomplete provenance',()=>{
  expect(()=>evaluateExpertBenchmark(input([record,{...second,reviewerId:'EXPERT-ALPHA'}]))).toThrow();
  expect(()=>evaluateExpertBenchmark(input([{...record,pmid:'33375403'},second]))).toThrow();
  expect(()=>evaluateExpertBenchmark(input([{...record,sourceLocator:' '},second]))).toThrow();
 });
 it('identical independent extracts remain comparable only after real source approval',()=>{
  const result=evaluateExpertBenchmark(input([record,second]));
  expect(result.disposition).toBe('ready-to-compare');
  expect(result.comparison).toBe('missing-platform-claim');
  expect(result.independentlyValidated).toBe(false);
 });
 it('preserves disagreement and requires a third identity to adjudicate',()=>{
  const changed={...second,finding:'does-not-support' as const};
  const result=evaluateExpertBenchmark(input([record,changed]));
  expect(result.disposition).toBe('needs-adjudication');
  expect(result.disagreements).toContain('finding');
  const adjudication={
   caseId:record.caseId,variantId:record.variantId,adjudicatorId:'expert-gamma',
   submittedAt:'2026-11-18T10:15:00Z',
   finalFinding:'inconclusive' as const,
   sourceLocator:'Table 2, expert reconciliation',
   justification:'Two differing interpretations require independent source reconciliation',
   acceptedReviewerIds:['expert-alpha','expert-beta'] as const
  };
  expect(()=>evaluateExpertBenchmark(input([record,changed],{
   ...adjudication,adjudicatorId:'expert-alpha'
  }))).toThrow();
  const reconciled=evaluateExpertBenchmark(input([record,changed],adjudication));
  expect(reconciled.disposition).toBe('awaiting-claim-mapping');
  expect(reconciled.comparison).toBe('missing-platform-claim');
  expect(reconciled.independentlyValidated).toBe(false);
 });
 it('does not interpret complex synonymous alleles as drug response',()=>{
  const a={...record,caseId:'c1584ga-complex-allele-splicing-2020',
   pmid:'33375403',genotypeContext:'Complex synonymous allele',
   endpoint:'Splicing observation',modelOrCohort:'Patient-derived model'};
  const result=evaluateExpertBenchmark({
   ...input([a,{...a,reviewerId:'expert-beta'}]),caseId:a.caseId
  });
  expect(result.comparison).toBe('missing-platform-claim');
  expect(result.clinicalDecision).toBe(false);
 });
});
