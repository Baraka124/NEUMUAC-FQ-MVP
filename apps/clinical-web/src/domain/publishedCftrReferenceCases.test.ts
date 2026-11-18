import {describe,it,expect} from 'vitest';
import {PUBLISHED_CFTR_REFERENCE_CASES,inspectPublishedCase} from './publishedCftrReferenceCases';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** This is a *synthetic software harness* exercising boundaries against real
 * bibliographic identifiers. No fixture source-approval event below happened
 * in the production database; no published clinical finding is fabricated.
 */
const pmid='31697873';
const ref:LiveEvidenceReference={
 id:91,variantId:'18',title:'Published ETI trial',
 source:'PubMed',url:'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/',
 type:null,category:null,journal:null,year:2019,pmid,doi:'10.1056/NEJMoa1908639',
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
const claim:CuratedSourceClaim={
 id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,parentClaimId:null,variantId:'18',referenceId:91,
 therapy:'ETI',scope:'genotype-specific',genotypePair:['18','19'],
 method:'clinical-study',finding:'inconclusive',studyFamilyId:'NCT03525444',
 locator:'Trial abstract; methods and genotype inclusion',
 rationale:'Synthetic review-harness placeholder, not a curated clinical observation',
 endpoint:null,studyStats:null,studyIdentity:null,
 status:'approved',submittedAt:'2026-11-18T08:00:00Z',
 submittedByMe:false,reviewCount:2,canReview:false,
 reviewedAt:'2026-11-18T08:05:00Z',
 reviewSeals:['attestation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'attestation:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],audit:[]
};
const run=(references:LiveEvidenceReference[],claims:CuratedSourceClaim[])=>
 inspectPublishedCase({caseId:'phe508del-mf-eti-2019',variantId:'18',references,claims});
describe('14H194–195 real-PubMed bibliography and benchmark readiness',()=>{
 it('registers distinct real publication IDs without claiming a completed evidence review',()=>{
  expect(PUBLISHED_CFTR_REFERENCE_CASES.map(c=>c.pmid)).toEqual([
   '22047557','31697873','33375403'
  ]);
  expect(PUBLISHED_CFTR_REFERENCE_CASES.every(c=>
   c.pubmedUrl==='https://pubmed.ncbi.nlm.nih.gov/'+c.pmid+'/'&&
   c.publicationEvidenceState==='bibliography-verified-not-curated')).toBe(true);
  expect(PUBLISHED_CFTR_REFERENCE_CASES[2]?.aliases).toContain('1716G/A');
  expect(PUBLISHED_CFTR_REFERENCE_CASES[2]?.therapy).toBe(null);
 });
 it('distinguishes missing bibliography from a bibliographic link without claims',()=>{
  expect(run([],[]).stage).toBe('unlinked');
  const linked=run([ref],[]);
  expect(linked.stage).toBe('bibliography-linked');
  expect(linked.independentlyValidated).toBe(false);
  expect(linked.clinicalDecision).toBe(false);
 });
 it('does not treat a source URL or pending revision as expert-reviewed scientific evidence',()=>{
  const pending={...claim,status:'pending' as const,reviewCount:0,
   reviewSeals:[],reviewedAt:null};
  expect(run([ref],[pending]).stage).toBe('source-claims-need-review');
  const fake={...ref,pmid:'33375403',url:'https://pubmed.ncbi.nlm.nih.gov/33375403/'};
  expect(run([fake],[]).stage).toBe('unlinked');
 });
 it('requires correct genotype scope for a clinical trial before human benchmark can begin',()=>{
  expect(run([ref],[claim]).stage).toBe('ready-for-expert-benchmark');
  expect(run([ref],[claim]).independentlyValidated).toBe(false);
  const incorrect={...claim,scope:'single-variant' as const,genotypePair:null};
  const result=run([ref],[incorrect]);
  expect(result.stage).toBe('source-claims-need-review');
  expect(result.issues.join(' ')).toContain('incorrectly reduced');
 });
 it('blocks reviewer-less approval or orphaned internal variant evidence',()=>{
  expect(()=>run([ref],[{...claim,reviewSeals:[claim.reviewSeals[0]!,claim.reviewSeals[0]!]}]))
   .toThrow();
  expect(()=>run([{...ref,variantId:'19'}],[])).toThrow();
  expect(()=>run([ref],[{...claim,variantId:'19'}])).toThrow();
  expect(()=>run([ref,ref],[])).toThrow();
 });
 it('keeps synonymous splicing challenge separate from any modulator-efficacy claim',()=>{
  const splicing:LiveEvidenceReference={...ref,id:92,pmid:'33375403',
   title:'Complex synonymous allele and splicing',
   url:'https://pubmed.ncbi.nlm.nih.gov/33375403/',doi:'10.3390/life11010014'};
  const result=inspectPublishedCase({caseId:'c1584ga-complex-allele-splicing-2020',
   variantId:'18',references:[splicing],claims:[]});
  expect(result.stage).toBe('bibliography-linked');
  expect(result.independentlyValidated).toBe(false);
  expect(PUBLISHED_CFTR_REFERENCE_CASES[2]?.nonInference.join(' ')).toContain('No ETI');
 });
});
