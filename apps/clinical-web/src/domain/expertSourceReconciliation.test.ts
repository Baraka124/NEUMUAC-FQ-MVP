import {describe,it,expect} from 'vitest';
import {evaluateExpertBenchmark,type ExpertExtraction,type ExpertAdjudication} from './expertBenchmarkAdjudication';
import {compareExpertWithPlatform} from './scientificBenchmarkComparison';

const first:ExpertExtraction={
 caseId:'g551d-ivacaftor-2011',variantId:'18',pmid:'22047557',
 reviewerId:'reviewer-A',submittedAt:'2026-11-18T10:00:00Z',
 sourceLocator:'Table 2',genotypeContext:'G551D-containing clinical cohort',
 endpoint:'sweat chloride',modelOrCohort:'clinical trial',
 finding:'inconclusive',claimId:null,
 methodNotes:'Independent software-only boundary test'
};
const second={...first,reviewerId:'reviewer-B',submittedAt:'2026-11-18T10:01:00Z'};
const adjudication:ExpertAdjudication={
 caseId:first.caseId,variantId:first.variantId,adjudicatorId:'reviewer-C',
 submittedAt:'2026-11-18T10:02:00Z',finalFinding:'inconclusive',
 sourceLocator:'Table 3',justification:'Independent source locator reconciliation',
 acceptedReviewerIds:['reviewer-A','reviewer-B']
};
const base=(extracts:readonly ExpertExtraction[],adjudicationValue?:ExpertAdjudication)=>({
 caseId:first.caseId,variantId:first.variantId,references:[],claims:[],
 extracts,adjudication:adjudicationValue??null
});
describe('14H210 independent reviewer source scope reconciliation',()=>{
 it('treats differing source locators as a disagreement requiring a third reviewer',()=>{
  const result=evaluateExpertBenchmark(base([first,{...second,sourceLocator:'Table 3'}]));
  expect(result.disagreements).toContain('sourceLocator');
  expect(result.disposition).toBe('needs-adjudication');
 });
 it('refuses synthetic adjudication when original reviewers already agreed',()=>{
  expect(()=>evaluateExpertBenchmark(base([first,second],adjudication))).toThrow(
   'Adjudication without a recorded independent expert disagreement');
 });
 it('retains disputed genotype context even after adjudication and a mapping',()=>{
  const changed={...second,genotypeContext:'Different experimental genotype context'};
  const outcome=compareExpertWithPlatform({
   ...base([first,changed],adjudication),
   mapping:{
    caseId:first.caseId,variantId:first.variantId,platformClaimId:'claim-placeholder',
    expertFinding:'inconclusive',claimFinding:'inconclusive',expertReportedFinding:null,
    genotypeContext:first.genotypeContext,endpointCode:'sweat-chloride',
    endpointTimepoint:'week-24',sourceLocator:'Table 3',
    attestedBy:'reviewer-D',attestedAt:'2026-11-18T10:03:00Z',
    mappingVersion:1
   }
  });
  // No source claim provided, so still categorically missing.
  expect(outcome.status).toBe('missing-source-claim');
  expect(outcome.scientificAccuracyValidated).toBe(false);
 });
});
