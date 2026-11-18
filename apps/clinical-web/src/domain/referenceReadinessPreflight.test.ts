import {describe,it,expect} from 'vitest';
import {preflightScientificReferences} from './referenceReadinessPreflight';
import type {ExpertRegistryRecord} from '../services/expertRegistryService';
import type {BenchmarkCaseInput} from './scientificBenchmarkLedger';

const record:ExpertRegistryRecord={
 source:'nfq-authenticated-expert-registry-v1',
 caseId:'g551d-ivacaftor-2011',variantId:'18',
 extracts:[],adjudication:null,mapping:null,audit:[]
};
const evidence:BenchmarkCaseInput={
 caseId:record.caseId,variantId:record.variantId,
 references:[],claims:[],extracts:[],adjudication:null,mapping:null
};
describe('14H209 independently audited research-readiness gates',()=>{
 it('reports empty inventory as unvalidated rather than approving deployment',()=>{
  const result=preflightScientificReferences([]);
  expect(result.evaluatedCases).toBe(0);
  expect(result.canCertifyScientificAccuracy).toBe(false);
  expect(result.readyForClinicalDeployment).toBe(false);
 });
 it('keeps missing blinded reviewer inputs explicit',()=>{
  const result=preflightScientificReferences([{registry:record,evidence}]);
  expect(result.completeReviewChains).toBe(0);
  expect(result.awaitingEvidence).toBe(1);
  expect(result.cases[0]?.state).toBe('awaiting-independent-reviews');
  expect(result.cases[0]?.pmid).toBe('22047557');
  expect(result.cases[0]?.eligibleForClinicalDecision).toBe(false);
 });
 it('rejects mismatched registry/claim identities',()=>{
  expect(()=>preflightScientificReferences([{registry:record,evidence:{
   ...evidence,caseId:'phe508del-mf-eti-2019'
  }}])).toThrow();
  expect(()=>preflightScientificReferences([{registry:record,evidence:{
   ...evidence,variantId:'19'
  }}])).toThrow();
 });
 it('rejects caller-supplied peer answers instead of trusting submitted arrays',()=>{
  const forged={...evidence,extracts:[{
   caseId:record.caseId,variantId:record.variantId,pmid:'22047557',
   reviewerId:'unverified-actor',submittedAt:'2026-11-18T16:00:00Z',
   sourceLocator:'Table 2',genotypeContext:'G551D-containing genotype',
   endpoint:'ppfev1',modelOrCohort:'clinical cohort',
   finding:'supports' as const,claimId:null,
   methodNotes:'Fixture only; no actual expert review'
  }]};
  expect(()=>preflightScientificReferences([{registry:record,evidence:forged}])).toThrow();
 });
 it('deduplicates the same paper and internal catalogue variant',()=>{
  expect(()=>preflightScientificReferences([
   {registry:record,evidence},{registry:record,evidence}
  ])).toThrow();
 });
 it('sorts independent bibliography identities deterministically',()=>{
  const other:ExpertRegistryRecord={...record,caseId:'phe508del-mf-eti-2019',variantId:'19'};
  const otherEvidence:BenchmarkCaseInput={
   ...evidence,caseId:other.caseId,variantId:other.variantId
  };
  const left=preflightScientificReferences([
   {registry:record,evidence},{registry:other,evidence:otherEvidence}
  ]);
  const right=preflightScientificReferences([
   {registry:other,evidence:otherEvidence},{registry:record,evidence}
  ]);
  expect(left).toEqual(right);
 });
});
