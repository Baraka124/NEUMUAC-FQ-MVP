import {describe,it,expect,vi} from 'vitest';
import {
 decodeCuratedClaims,reviewedSourceObservations,validSourceClaimPayload,
 createCuratedSourceClaimService,type CuratedClaimPayload
} from './curatedSourceClaims';
import type {ReadOnlyConfig} from './liveVariants';

const variant='18';
const approvedId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const seriesId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const sealA='attestation:cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const sealB='attestation:dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const valid={
 id:approvedId,seriesId,revision:1,parentClaimId:null,variantId:variant,
 referenceId:71,therapy:'ETI',scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'reported-response',studyFamilyId:'PMID-12345678',
 locator:'Original paper · Table 2',rationale:'Independent review of a measured CFTR activity endpoint.',
 status:'approved',submittedAt:'2026-09-01T00:00:00Z',submittedByMe:false,
 reviewCount:2,canReview:false,reviewedAt:'2026-09-02T00:00:00Z',
 reviewSeals:[sealA,sealB],
 audit:[{action:'submitted',at:'2026-09-01T00:00:00Z'},
 {action:'review-approved',at:'2026-09-01T11:00:00Z'},
 {action:'review-approved',at:'2026-09-02T00:00:00Z'},
 {action:'approved',at:'2026-09-02T00:00:00Z'}]
};
const envelope=(claims:unknown[])=>({variantId:variant,source:'nfq-double-independent-review-v1',claims});
const payload:CuratedClaimPayload={
 therapy:'ETI',referenceId:71,scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'reported-response',studyFamilyId:'PMID-12345678',
 locator:'Original paper · Table 2',rationale:'The recorded assay endpoint is traceable to this source.'
};
const config:ReadOnlyConfig={endpoint:'https://cftr-contract.invalid',
 publishableKey:'sb_publishable_test_contract',enabled:true,accessMode:'anonymous',readTable:'variants'};
const token=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','test'].join('.');
describe('14H166 approved-only evidence curation contracts',()=>{
 it('turns a twice-attested approved version into a source-bound engine observation',()=>{
  const all=decodeCuratedClaims(envelope([valid]),variant);
  const observations=reviewedSourceObservations(all,variant,[71]);
  expect(observations).toHaveLength(1);
  expect(observations[0].therapy).toBe('ETI');
  expect(observations[0].reviewedBy).toHaveLength(2);
  expect(observations[0].reviewedBy[0]).not.toBe(observations[0].reviewedBy[1]);
 });
 it('does not promote pending, rejected, withdrawn or superseded revisions',()=>{
  const histories=['pending','rejected','withdrawn','superseded'].map((status,i)=>({
   ...valid,id:valid.id.replace(/^./,String(i+1)),seriesId:valid.seriesId.replace(/^./,String(i+1)),
   status,reviewCount:status==='pending'?1:0,reviewedAt:null,reviewSeals:[],
   canReview:status==='pending'
  }));
  const data=decodeCuratedClaims(envelope(histories),variant);
  expect(reviewedSourceObservations(data,variant,[71])).toHaveLength(0);
 });
 it('refuses approved claims missing two independent reviewer attestations',()=>{
  for(const row of [
   {...valid,reviewCount:1,reviewSeals:[sealA]},
   {...valid,reviewSeals:[sealA,sealA]},
   {...valid,reviewedAt:null},
   {...valid,reviewCount:0},
   {...valid,reviewSeals:[]}
  ])expect(()=>decodeCuratedClaims(envelope([row]),variant)).toThrow();
 });
 it('rejects different reference, wrong variant, duplicate series revision, and inconsistent genotype',()=>{
  expect(()=>decodeCuratedClaims(envelope([{...valid,variantId:'19'}]),variant)).toThrow();
  expect(()=>decodeCuratedClaims(envelope([valid,valid]),variant)).toThrow();
  expect(()=>decodeCuratedClaims(envelope([{...valid,scope:'genotype-specific',genotypePair:null}]),variant)).toThrow();
  expect(()=>reviewedSourceObservations(decodeCuratedClaims(envelope([valid]),variant),variant,[72])).toThrow();
 });
 it('recognizes exact variant reference, source locator and structured scope before allowing submission',()=>{
  expect(validSourceClaimPayload(variant,payload,[71])).toBe(true);
  expect(validSourceClaimPayload(variant,{...payload,referenceId:72},[71])).toBe(false);
  expect(validSourceClaimPayload(variant,{...payload,locator:'Table'},[71])).toBe(false);
  expect(validSourceClaimPayload(variant,{...payload,rationale:'short'},[71])).toBe(false);
  expect(validSourceClaimPayload(variant,{...payload,scope:'genotype-specific',genotypePair:['18','19']},[71])).toBe(true);
  expect(validSourceClaimPayload(variant,{...payload,scope:'genotype-specific',genotypePair:['19','20']},[71])).toBe(false);
 });
 it('uses exact researcher-only RPC, posts no browser role assertion or reviewer identity',async()=>{
  const transport=vi.fn(async(_url:string,init?:RequestInit)=>{
   const req=JSON.parse(String(init?.body));
   return new Response(JSON.stringify(req.p_action==='list'?envelope([]):{
    id:approvedId,revision:1,status:'pending'
   }),{status:200});
  });
  const reader=createCuratedSourceClaimService(config,{getAccessToken:async()=>token},transport as typeof fetch);
  expect(await reader.list('18')).toEqual([]);
  expect(await reader.submit('18',payload,[71])).toBe(approvedId);
  const sent=transport.mock.calls.map(([,init])=>JSON.parse(String(init?.body)));
  expect(sent.map(x=>x.p_action)).toEqual(['list','submit']);
  expect(sent.every(x=>x.p_variant_id==='18')).toBe(true);
  expect(sent.every(x=>!('reviewer_id' in x)&&!('actor_id' in x)&&!('role' in x))).toBe(true);
 });
 it('fails without an active token, before touching a network source',async()=>{
  const transport=vi.fn();
  const service=createCuratedSourceClaimService(config,{getAccessToken:async()=>null},transport as typeof fetch);
  await expect(service.list('18')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
 it('refuses malformed independent review notes before network request',async()=>{
  const transport=vi.fn();
  const service=createCuratedSourceClaimService(config,{getAccessToken:async()=>token},transport as typeof fetch);
  await expect(service.review(variant,approvedId,1,'approve','short')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
});
