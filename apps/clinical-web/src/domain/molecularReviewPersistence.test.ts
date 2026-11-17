import {describe,expect,it} from 'vitest';
import {decodeMolecularReviewRecords} from '../services/molecularReviewService';

const uuidA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const uuidB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const uuidC='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sealA='attestation:'+uuidA;
const sealB='attestation:'+uuidB;
const review=(decision:'approve'|'reject'='approve')=>({
 decision,note:'This study interpretation has been reviewed against the original source in full.',
 at:'2026-11-17T13:20:00Z'
});
const record=(overrides:Record<string,unknown>={})=>({
 id:uuidA,seriesId:uuidB,revision:1,parentId:null,
 variantId:'18',sourceClaimId:uuidC,
 categories:['rna-splicing','protein-folding'],
 interpretation:'mechanistic-hypothesis',
 statement:'A source-based hypothesis describing RNA processing and a possible downstream effect.',
 exactLocator:'Source article Figure 2A',
 experimentalContext:'Assay performed in an experimental culture with documented CFTR variant identity.',
 limitations:'The proposed pathway is not demonstrated as causal by the available results.',
 status:'pending',submittedAt:'2026-11-17T13:00:00Z',submittedByMe:false,canReview:true,
 reviewCount:1,reviewSeals:[],reviewAudit:[review()],events:[{action:'submitted',at:'2026-11-17T13:00:00Z'}],
 ...overrides
});
const response=(claims:unknown[])=>({
 variantId:'18',source:'nfq-independent-molecular-review-v1',claims
});
describe('14H187–188 persisted independent molecular review decoding',()=>{
 it('keeps pending molecular hypotheses separate from validated mechanism records',()=>{
  const rows=decodeMolecularReviewRecords(response([record()]),'18');
  expect(rows).toHaveLength(1);
  expect(rows[0]?.status).toBe('pending');
  expect(rows[0]?.reviewCount).toBe(1);
  expect(rows[0]?.categories).toEqual(['rna-splicing','protein-folding']);
  expect(rows[0]?.reviewSeals).toHaveLength(0);
 });
 it('requires two unique server attestations for approved molecular interpretations',()=>{
  const approved=record({status:'approved',reviewCount:2,reviewSeals:[sealA,sealB],reviewAudit:[review(),review()]});
  expect(decodeMolecularReviewRecords(response([approved]),'18')[0]?.status).toBe('approved');
  expect(()=>decodeMolecularReviewRecords(response([
   {...approved,reviewCount:1}
  ]),'18')).toThrow();
  expect(()=>decodeMolecularReviewRecords(response([
   {...approved,reviewSeals:[sealA,sealA]}
  ]),'18')).toThrow();
 });
 it('fails closed on cross-variant, duplicated revisions, malformed audit or missing provenance',()=>{
  expect(()=>decodeMolecularReviewRecords(response([record({variantId:'19'})]),'18')).toThrow();
  expect(()=>decodeMolecularReviewRecords(response([record(),record()]),'18')).toThrow();
  expect(()=>decodeMolecularReviewRecords(response([
   record({sourceClaimId:'invalid'})
  ]),'18')).toThrow();
  expect(()=>decodeMolecularReviewRecords(response([
   record({events:[{action:'invented',at:'2026-11-17T13:00:00Z'}]})
  ]),'18')).toThrow();
 });
 it('allows an approved revision while maintaining superseded, auditable earlier history',()=>{
  const first=record({status:'superseded',reviewCount:2,
   id:uuidA,revision:1,parentId:null});
  const second=record({id:uuidC,revision:2,parentId:uuidA,
   status:'approved',reviewCount:2,reviewSeals:[sealA,sealB],reviewAudit:[review(),review()]});
  const rows=decodeMolecularReviewRecords(response([first,second]),'18');
  expect(rows.map(c=>c.status)).toEqual(['superseded','approved']);
  expect(rows[1]?.parentId).toBe(uuidA);
 });
});
