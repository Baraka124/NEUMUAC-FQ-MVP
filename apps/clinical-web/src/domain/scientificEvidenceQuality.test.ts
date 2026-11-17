import {describe,expect,it} from 'vitest';
import {assessScientificEvidenceQuality,reviewChecklistComplete,
 reviewChecklistInitial,REVIEW_CHECKLIST} from './scientificEvidenceQuality';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';
const s1='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const s2='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const m1='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const m2='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const ref={id:71,variantId:'18',title:'Source bibliography item',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/'} as LiveEvidenceReference;
const claim=(id=s1,more:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id,seriesId:id,revision:1,parentClaimId:null,variantId:'18',referenceId:71,
 therapy:'ETI',scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'reported-response',studyFamilyId:'study-source-a',
 locator:'Results Figure 2B',
 rationale:'Original assay result with explicitly reported scientific limitations.',
 endpoint:null,studyStats:null,studyIdentity:null,status:'approved',
 submittedAt:'2026-11-18T00:00:00Z',submittedByMe:false,reviewCount:2,
 reviewedAt:'2026-11-18T00:30:00Z',canReview:false,
 reviewSeals:['attestation:11111111-1111-4111-8111-111111111111',
 'attestation:22222222-2222-4222-8222-222222222222'],audit:[],
 ...more
});
const mechanism=(id=m1,more:Partial<MolecularReviewRecord>={}):MolecularReviewRecord=>({
 id,seriesId:id,revision:1,parentId:null,variantId:'18',sourceClaimId:s1,
 categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
 statement:'The publication discusses a possible transcript-processing mechanism.',
 exactLocator:'Original Results Figure 2B',
 experimentalContext:'Original cellular model with exact variant identity.',
 limitations:'No independent clinical causal claim is supported.',
 status:'approved',submittedAt:'2026-11-18T00:40:00Z',
 submittedByMe:false,canReview:false,reviewCount:2,
 reviewSeals:['attestation:33333333-3333-4333-8333-333333333333',
 'attestation:44444444-4444-4444-8444-444444444444'],
 reviewAudit:[
 {decision:'approve',note:'Independently verified the scientific interpretation.',at:'2026-11-18T00:50:00Z'},
 {decision:'approve',note:'Second independent review confirmed source limitations.',at:'2026-11-18T00:55:00Z'}
 ],events:[],...more
});
const evaluate=(claims:CuratedSourceClaim[],mechanisms:MolecularReviewRecord[],
 references:LiveEvidenceReference[]=[ref])=>
 assessScientificEvidenceQuality({variantId:'18',claims,mechanisms,references});
describe('14H197–198 source-level quality triage, without clinical inference',()=>{
 it('makes an empty verified register explicit rather than inventing gaps or conflicts',()=>{
  expect(evaluate([],[],[])).toEqual([]);
 });
 it('separates no-extracted endpoint and model from absence of experimental evidence',()=>{
  const flags=evaluate([claim()],[]);
  expect(flags.map(f=>f.code)).toContain('endpoint-unextracted');
  expect(flags.map(f=>f.code)).toContain('study-identity-unextracted');
  expect(flags.some(f=>f.severity==='provenance-blocked')).toBe(false);
 });
 it('detects a missing original publication without claiming the source is biologically invalid',()=>{
  const flags=evaluate([claim()],[],[]);
  expect(flags.some(f=>f.code==='unlinked-publication'&&
   f.severity==='provenance-blocked')).toBe(true);
 });
 it('identifies overlapping study family and differing findings as questions, not proven conflicts',()=>{
  const flags=evaluate([
   claim(),claim(s2,{finding:'reported-no-response'})
  ],[]);
  expect(flags.map(f=>f.code)).toContain('shared-study-family');
  const differing=flags.find(f=>f.code==='source-findings-differ');
  expect(differing?.severity).toBe('review-needed');
  expect(differing?.recordIds).toEqual([s1,s2]);
  expect(differing?.explanation).toContain('Check genotype scope');
 });
 it('does not treat a pending source or molecular proposal as approved',()=>{
  const flags=evaluate([
   claim(s1,{status:'pending',reviewCount:1,reviewSeals:[],reviewedAt:null})
  ],[mechanism(m1,{status:'pending',reviewCount:0,reviewSeals:[],reviewAudit:[]})]);
  expect(flags.map(f=>f.code)).toContain('source-review-pending');
  expect(flags.map(f=>f.code)).toContain('molecular-review-pending');
  expect(flags.map(f=>f.code)).toContain('molecular-source-unverified');
 });
 it('preserves hypothesis semantics after independent scientific review',()=>{
  const flags=evaluate([claim()],[mechanism()]);
  expect(flags.find(f=>f.code==='molecular-hypothesis')?.severity).toBe('information');
  expect(flags.map(f=>f.code)).not.toContain('molecular-review-pending');
 });
 it('flags two distinct interpretations of the same source for human context review',()=>{
  const flags=evaluate([claim()],[
   mechanism(m1),
   mechanism(m2,{interpretation:'contradictory-or-uncertain'})
  ]);
  expect(flags.map(f=>f.code)).toContain('molecular-interpretations-differ');
  expect(flags.map(f=>f.code)).toContain('molecular-uncertain');
 });
 it('fails closed if a record leaks in from a different exact variant',()=>{
  expect(()=>evaluate([claim(s1,{variantId:'19'})],[])).toThrow();
  expect(()=>evaluate([claim()],[mechanism(m1,{variantId:'19'})])).toThrow();
  expect(()=>evaluate([claim()],[],[{...ref,variantId:'19'}])).toThrow();
  expect(()=>evaluate([claim(),claim()],[])).toThrow();
 });
});
describe('14H197 local reviewer preparation, separate from server permissions',()=>{
 it('requires all five scientific context checks without auto-approving anything',()=>{
  const initial=reviewChecklistInitial();
  expect(reviewChecklistComplete(initial)).toBe(false);
  expect(REVIEW_CHECKLIST).toHaveLength(5);
  const complete={...initial};
  for(const item of REVIEW_CHECKLIST)complete[item.id]=true;
  expect(reviewChecklistComplete(complete)).toBe(true);
  complete['study-independence']=false;
  expect(reviewChecklistComplete(complete)).toBe(false);
 });
});
