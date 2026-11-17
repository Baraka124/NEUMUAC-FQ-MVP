import {describe,it,expect} from 'vitest';
import {buildPairedEvidenceQuestions} from './pairedEvidenceQuestions';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

function reference(id:string):LiveEvidenceReference{
 return {id:71,variantId:id,title:'Source '+id,
  url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',source:'PubMed',
  type:null,category:null,journal:null,year:2024,pmid:'12345678',doi:null,
  recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
}
function claim(variantId:string,overrides:Partial<CuratedSourceClaim>={}):CuratedSourceClaim{
 return {
  id:variantId==='18'?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  seriesId:variantId==='18'?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  revision:1,parentClaimId:null,variantId,referenceId:71,therapy:'ETI',
  scope:'single-variant',genotypePair:null,method:'clinical-study',finding:'reported-response',
  studyFamilyId:'study-'+variantId,locator:'Results Table 2',rationale:'Source observation',
  endpoint:null,studyStats:null,studyIdentity:null,status:'approved',
  submittedAt:'2026-11-17T09:00:00Z',submittedByMe:false,reviewCount:2,
  canReview:false,reviewedAt:'2026-11-17T10:00:00Z',
  reviewSeals:['attestation:a','attestation:b'],audit:[],...overrides
 };
}
const both=(left:readonly CuratedSourceClaim[],right:readonly CuratedSourceClaim[])=>
 buildPairedEvidenceQuestions({
  firstId:'18',secondId:'19',firstClass:'II',secondClass:'II',
  firstClaims:left,secondClaims:right,
  firstReferences:[reference('18')],secondReferences:[reference('19')]
 });
describe('14H183–184 source-traceable mechanism investigation',()=>{
 it('keeps independently reviewed claims, studies, and citations separate by variant',()=>{
  const result=both([claim('18')],[claim('19',{finding:'reported-no-response'})]);
  expect(result.recordedClassRelation).toBe('same-recorded-class');
  expect(result.mechanismEstablished).toBe(false);
  expect(result.questions).toHaveLength(1);
  expect(result.questions[0]?.relation).toBe('different-assay-context');
  expect(result.questions[0]?.left.variantId).toBe('18');
  expect(result.questions[0]?.right.variantId).toBe('19');
  expect(result.questions[0]?.left.sourceUrl).toContain('pubmed');
  expect(result.questions[0]?.requiresScientificReview).toBe(true);
 });
 it('does not manufacture mechanistic equivalence from a shared class or missing publications',()=>{
  const result=both([],[]);
  expect(result.questions).toHaveLength(0);
  expect(result.mechanismEstablished).toBe(false);
  expect(result.firstApprovedSources).toBe(0);
 });
 it('excludes pending and rejected observations from paired scientific evidence',()=>{
  const result=both([claim('18',{status:'pending',reviewCount:0,reviewedAt:null,reviewSeals:[]})],
   [claim('19')]);
  expect(result.questions).toHaveLength(0);
  expect(result.firstApprovedSources).toBe(0);
 });
 it('refuses unverified attestations, incorrect source identities, and same-variant comparisons',()=>{
  expect(()=>both([claim('18',{reviewSeals:['same','same']})],[claim('19')])).toThrow();
  expect(()=>both([claim('18',{referenceId:72})],[claim('19')])).toThrow();
  expect(()=>both([claim('19')],[claim('19')])).toThrow();
  expect(()=>buildPairedEvidenceQuestions({
   firstId:'18',secondId:'18',firstClass:'II',secondClass:'II',
   firstClaims:[],secondClaims:[],firstReferences:[],secondReferences:[]
  })).toThrow();
 });
});
