import {describe,it,expect} from 'vitest';
import {inspectExpertWorkflow} from './expertReviewWorkflowAudit';
import type {ExpertRegistryRecord} from '../services/expertRegistryService';
import type {ExpertExtraction} from './expertBenchmarkAdjudication';

const reviewer1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reviewer2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const adjudicator='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const attestor='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const submission:ExpertExtraction={
 caseId:'phe508del-mf-eti-2019',variantId:'18',pmid:'31697873',
 reviewerId:reviewer1,submittedAt:'2026-11-18T10:00:00Z',
 sourceLocator:'Table 2',genotypeContext:'Phe508del/minimal-function',
 endpoint:'ppFEV1',modelOrCohort:'randomized trial',finding:'inconclusive',
 claimId:null,methodNotes:'Independent research-only review'
};
const second:ExpertExtraction={...submission,reviewerId:reviewer2,submittedAt:'2026-11-18T10:01:00Z'};
const event=(actorId:string,action:'extraction-submitted'|'adjudication-submitted'|'mapping-attested',at:string,index:number)=>({
 eventId:['eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee2',
 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee3','eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee4'][index]!,actorId,action,at
});
const base:ExpertRegistryRecord={
 caseId:submission.caseId,variantId:submission.variantId,
 extracts:[],adjudication:null,mapping:null,audit:[],
 source:'nfq-authenticated-expert-registry-v1'
};
describe('14H204 expert evidence history invariants',()=>{
 it('preserves missing reviewer states, not fabricated review completion',()=>{
  expect(inspectExpertWorkflow(base).state).toBe('awaiting-first-reviewer');
  const one={...base,extracts:[submission],audit:[event(reviewer1,'extraction-submitted',submission.submittedAt,0)]};
  expect(inspectExpertWorkflow(one).state).toBe('awaiting-second-reviewer');
  expect(inspectExpertWorkflow(one).externallyValidated).toBe(false);
 });
 it('allows matching extracts but still awaits independent claim mapping',()=>{
  const record={...base,extracts:[submission,second],audit:[
   event(reviewer1,'extraction-submitted',submission.submittedAt,0),
   event(reviewer2,'extraction-submitted',second.submittedAt,1)
  ]};
  expect(inspectExpertWorkflow(record).state).toBe('awaiting-attested-mapping');
 });
 it('rejects omitted source review event and wrong source identity',()=>{
  const record={...base,extracts:[submission],audit:[]};
  expect(()=>inspectExpertWorkflow(record)).toThrow();
  expect(()=>inspectExpertWorkflow({...base,extracts:[{...submission,pmid:'33375403'}],
   audit:[event(reviewer1,'extraction-submitted',submission.submittedAt,0)]})).toThrow();
 });
 it('requires a third expert and later timestamp for conflicting source findings',()=>{
  const different={...second,finding:'does-not-support' as const};
  const audit=[
   event(reviewer1,'extraction-submitted',submission.submittedAt,0),
   event(reviewer2,'extraction-submitted',different.submittedAt,1)
  ];
  const unresolved={...base,extracts:[submission,different],audit};
  expect(inspectExpertWorkflow(unresolved).state).toBe('awaiting-adjudication');
  const adjudication={
   caseId:submission.caseId,variantId:submission.variantId,adjudicatorId:adjudicator,
   submittedAt:'2026-11-18T10:02:00Z',finalFinding:'inconclusive' as const,
   sourceLocator:'Table 2',justification:'Independent reconciled source interpretation',
   acceptedReviewerIds:[reviewer1,reviewer2] as const
  };
  const reviewed={...unresolved,adjudication,audit:[
   ...audit,event(adjudicator,'adjudication-submitted',adjudication.submittedAt,2)
  ]};
  expect(inspectExpertWorkflow(reviewed).state).toBe('awaiting-attested-mapping');
  expect(()=>inspectExpertWorkflow({...reviewed,adjudication:{
   ...adjudication,adjudicatorId:reviewer1
  }})).toThrow();
  expect(()=>inspectExpertWorkflow({...reviewed,adjudication:{
   ...adjudication,submittedAt:'2026-11-18T09:59:00Z'
  }})).toThrow();
 });
 it('rejects a mapping that predates the independent source review',()=>{
  const mapping={
   caseId:submission.caseId,variantId:submission.variantId,platformClaimId:attestor,
   expertFinding:'inconclusive' as const,claimFinding:'inconclusive' as const,
   expertReportedFinding:null,genotypeContext:submission.genotypeContext,
   endpointCode:'ppfev1',endpointTimepoint:'week-24',
   sourceLocator:submission.sourceLocator,attestedBy:attestor,
   attestedAt:'2026-11-18T09:59:00Z',mappingVersion:1 as const
  };
  const record={...base,extracts:[submission,second],mapping,audit:[
   event(reviewer1,'extraction-submitted',submission.submittedAt,0),
   event(reviewer2,'extraction-submitted',second.submittedAt,1),
   event(attestor,'mapping-attested',mapping.attestedAt,2)
  ]};
  expect(()=>inspectExpertWorkflow(record)).toThrow();
 });
});
