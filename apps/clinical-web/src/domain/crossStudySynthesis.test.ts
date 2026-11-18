import {describe,it,expect} from 'vitest';
import {synthesizeReviewedStudies} from './crossStudySynthesis';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

const reference:LiveEvidenceReference={
 id:31,variantId:'18',title:'Original publication',source:'PubMed',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',type:null,category:null,
 journal:null,year:2024,pmid:'12345678',doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
const base:CuratedSourceClaim={
 id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,parentClaimId:null,variantId:'18',referenceId:31,therapy:'ETI',
 scope:'single-variant',genotypePair:null,method:'in-vitro-study',
 finding:'reported-response',studyFamilyId:'original-study',
 locator:'Figure 2B · original paper',
 rationale:'Reviewed in original experimental study context',
 endpoint:null,studyStats:null,studyIdentity:null,
 status:'approved',submittedAt:'2026-11-18T08:00:00Z',submittedByMe:false,
 reviewCount:2,canReview:false,reviewedAt:'2026-11-18T08:30:00Z',
 reviewSeals:['attestation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'attestation:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],audit:[]
};
const other:CuratedSourceClaim={...base,
 id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 studyFamilyId:'second-study',finding:'reported-no-response'
};
const run=(claims:readonly CuratedSourceClaim[],refs:readonly LiveEvidenceReference[]=[reference])=>
 synthesizeReviewedStudies({variantId:'18',therapy:'ETI',claims,references:refs});
describe('14H192–193 source-linked study synthesis and conflicts',()=>{
 it('groups repeated publication claims conservatively and never asserts replication',()=>{
  const result=run([base,{...other,studyFamilyId:'original-study'}]);
  expect(result.studies).toHaveLength(1);
  expect(result.issues.some(i=>i.kind==='within-study-opposition')).toBe(true);
  expect(result.replicationProven).toBe(false);
  expect(result.effectEstimate).toBe(null);
  expect(result.conclusion).toBe('no-automatic-directional-conclusion');
  expect(result.studies[0]?.claimIds).toHaveLength(2);
 });
 it('surfaces opposing independently registered families without deciding therapeutic response',()=>{
  const result=run([base,other]);
  expect(result.studies).toHaveLength(2);
  expect(result.issues.some(i=>i.kind==='population-or-assay-mismatch')).toBe(true);
  const conflict=result.issues.find(i=>i.kind==='population-or-assay-mismatch')!;
  expect(conflict.claimIds).toHaveLength(2);
  expect(conflict.referenceIds).toEqual([31]);
  expect(result.decisionSupport).toBe(false);
 });
 it('allows comparable direction conflict only after study model is explicitly extracted',()=>{
  const identity={
   registryType:'not-reported' as const,registryId:null,
   publicationRole:'primary-report' as const,populationModel:'primary-cells' as const,
   diseaseGroup:'cystic-fibrosis' as const,ageGroup:'not-reported' as const,
   cohortLabel:null,populationDescription:null,sourceLocator:'Original methods section'
  };
  const result=run([{...base,studyIdentity:identity},{...other,studyIdentity:identity}]);
  expect(result.issues.some(i=>i.kind==='cross-study-opposition')).toBe(true);
 });
 it('distinguishes genotype-scope differences from directly comparable disagreement',()=>{
  const result=run([base,{...other,scope:'genotype-specific',genotypePair:['18','19']}]);
  expect(result.issues.some(i=>i.kind==='genotype-scope-mismatch')).toBe(true);
  expect(result.issues.some(i=>i.kind==='cross-study-opposition')).toBe(false);
 });
 it('ignores pending interpretation and rejects orphaned or fake approvals',()=>{
  const pending:CuratedSourceClaim={...other,status:'pending',reviewCount:0,
   reviewSeals:[],reviewedAt:null};
  expect(run([base,pending]).approvedSourceClaims).toBe(1);
  expect(()=>run([base],[])).toThrow();
  expect(()=>run([base,{...other,variantId:'19'}])).toThrow();
  expect(()=>run([base,{...other,id:base.id}])).toThrow();
  expect(()=>run([base,{...other,reviewSeals:[base.reviewSeals[0]!,base.reviewSeals[0]!]}])).toThrow();
 });
});
