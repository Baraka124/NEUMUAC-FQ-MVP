import {describe,expect,it} from 'vitest';
import {filterReviewQueue,molecularProvenancePath,reviewQueueItems} from './researchReviewQueue';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';

const sourceId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const molId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const source=(overrides:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id:sourceId,variantId:'18',seriesId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 revision:1,parentClaimId:null,referenceId:71,studyFamilyId:'PMID-12345678',
 locator:'Original Figure 2B',rationale:'Interpretation explicitly constrained by source assay.',
 therapy:'ETI',scope:'single-variant',genotypePair:null,method:'in-vitro-study',
 finding:'inconclusive',endpoint:null,studyStats:null,studyIdentity:null,
 status:'approved',reviewCount:2,
 reviewSeals:['attestation:11111111-1111-4111-8111-111111111111',
 'attestation:22222222-2222-4222-8222-222222222222'],
 reviewedAt:'2026-11-17T19:00:00Z',submittedAt:'2026-11-17T15:00:00Z',
 submittedByMe:false,canReview:false,audit:[],...overrides
});
const molecular=(overrides:Partial<MolecularReviewRecord>={}):MolecularReviewRecord=>({
 id:molId,variantId:'18',seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 revision:1,parentId:null,sourceClaimId:sourceId,
 categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
 statement:'The original study reports an experimental observation of altered transcript processing.',
 exactLocator:'Original Figure 2B',experimentalContext:'Source-specific experimental cell model',
 limitations:'Experimental model cannot be assumed clinically equivalent',
 status:'approved',submittedAt:'2026-11-17T19:30:00Z',
 submittedByMe:false,canReview:false,reviewCount:2,
 reviewSeals:['attestation:33333333-3333-4333-8333-333333333333',
 'attestation:44444444-4444-4444-8444-444444444444'],
 reviewAudit:[
  {decision:'approve',note:'First independently verified scientific review of source.',at:'2026-11-17T19:31:00Z'},
  {decision:'approve',note:'Second independently verified scientific review of source.',at:'2026-11-17T19:32:00Z'}
 ],events:[],...overrides
});
const original={
 id:71,variantId:'18',title:'Actual original publication',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/'
} as LiveEvidenceReference;
describe('14H193 authenticated review queue projections',()=>{
 it('separates actionable from pending, approved and revision history',()=>{
  const items=reviewQueueItems({variantId:'18',claims:[
   source({status:'pending',reviewCount:1,canReview:true,reviewSeals:[],reviewedAt:null})
  ],mechanisms:[molecular({status:'rejected',reviewCount:0,reviewSeals:[],reviewAudit:[]})]});
  expect(filterReviewQueue(items,'actionable').map(x=>x.kind)).toEqual(['source']);
  expect(filterReviewQueue(items,'pending')).toHaveLength(1);
  expect(filterReviewQueue(items,'history').map(x=>x.kind)).toEqual(['molecular']);
  expect(filterReviewQueue(items,'approved')).toHaveLength(0);
 });
 it('never turns a pending submitted claim into a reviewer-authorized action',()=>{
  const item=reviewQueueItems({variantId:'18',claims:[source({
   status:'pending',reviewCount:0,canReview:false,submittedByMe:true,
   reviewSeals:[],reviewedAt:null
  })],mechanisms:[]});
  expect(filterReviewQueue(item,'actionable')).toHaveLength(0);
  expect(filterReviewQueue(item,'pending')).toHaveLength(1);
 });
 it('rejects mixed-variant or duplicate source identities',()=>{
  expect(()=>reviewQueueItems({variantId:'18',claims:[source({variantId:'19'})],mechanisms:[]})).toThrow();
  expect(()=>reviewQueueItems({variantId:'18',claims:[source(),source()],mechanisms:[]})).toThrow();
 });
});
describe('14H194 publication-to-molecular provenance trace',()=>{
 it('only identifies a complete double-approved chain when source and molecular records independently qualify',()=>{
  const path=molecularProvenancePath({mechanism:molecular(),claims:[source()],references:[original]});
  expect(path.sourceReady).toBe(true);
  expect(path.mechanismApprovedAndLinked).toBe(true);
  expect(path.originalUrl).toBe(original.url);
  expect(path.sourceLocator).toBe('Original Figure 2B');
 });
 it('fails closed when bibliography or source approval is absent',()=>{
  const noReference=molecularProvenancePath({mechanism:molecular(),claims:[source()],references:[]});
  expect(noReference.mechanismApprovedAndLinked).toBe(false);
  const pendingSource=molecularProvenancePath({
   mechanism:molecular(),claims:[source({status:'pending',reviewCount:1,
    reviewSeals:[],reviewedAt:null})],references:[original]
  });
  expect(pendingSource.mechanismApprovedAndLinked).toBe(false);
  expect(pendingSource.limitations).toContain('Underlying source claim is not currently approved');
 });
 it('never infers a scientific approval from molecular revision labels alone',()=>{
  const result=molecularProvenancePath({mechanism:molecular({status:'pending',reviewCount:1,
   reviewSeals:[],reviewAudit:[]}),claims:[source()],references:[original]});
  expect(result.sourceReady).toBe(true);
  expect(result.mechanismApprovedAndLinked).toBe(false);
 });
 it('refuses cross-variant publication linkage',()=>{
  expect(()=>molecularProvenancePath({mechanism:molecular(),
   claims:[source()],references:[{...original,variantId:'19'}]})).toThrow();
 });
});
