import {describe,it,expect,vi} from 'vitest';
import {
 createStudyAdjudicationsService,decodeStudyAdjudications,
 validProposal,validReviewNote
} from './studyAdjudications';
import type {ApprovedDatasetSnapshot} from './approvedResearchDataset';
import type {ReadOnlyConfig} from './liveVariants';

const claimA='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const claimB='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const adjudicationId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const proposal={
 id:adjudicationId,claimA,claimB,revision:1,disposition:'same-study',
 rationale:'Both publications share the same registered clinical trial.',
 evidenceLocator:'Source Methods · Study registration',
 status:'pending',submittedAt:'2026-11-17T10:00:00Z',
 decidedAt:null,reviewCount:1,submittedByMe:false,canReview:true
};
const snapshot={
 source:'nfq-approved-research-dataset-v1',schemaVersion:1,
 snapshotSha256:'a'.repeat(64),generatedAt:'2026-11-17T09:00:00Z',
 total:2,limitations:[],records:[{claimId:claimA},{claimId:claimB}]
} as unknown as ApprovedDatasetSnapshot;
const config:ReadOnlyConfig={
 endpoint:'https://cftr-contract.invalid',publishableKey:'sb_publishable_contract',
 enabled:true,accessMode:'anonymous',readTable:'variants'
};
const token=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','test'].join('.');
describe('14H173 independent adjudication service boundaries',()=>{
 it('accepts only complete current approved-source pair review inventories',()=>{
  const answer={source:'nfq-study-adjudication-v1',total:1,records:[proposal]};
  expect(decodeStudyAdjudications(answer,snapshot)).toHaveLength(1);
  expect(()=>decodeStudyAdjudications({...answer,total:2},snapshot)).toThrow();
  expect(()=>decodeStudyAdjudications({...answer,records:[proposal,proposal],total:2},snapshot)).toThrow();
  expect(()=>decodeStudyAdjudications({...answer,records:[{...proposal,claimB:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'}]},snapshot)).toThrow();
  expect(()=>decodeStudyAdjudications({...answer,records:[{...proposal,status:'approved'}]},snapshot)).toThrow();
  expect(()=>decodeStudyAdjudications({...answer,records:[{...proposal,reviewCount:3}]},snapshot)).toThrow();
 });
 it('requires source explanations, canonical current claims and independent reviewer notes',()=>{
  expect(validProposal(claimA,claimB,'same-study',
   'The primary source identifies one registered clinical study.',
   'Methods · Trial registration')).toBe(true);
  expect(validProposal(claimA,claimA,'same-study',
   'The primary source identifies one registered clinical study.',
   'Methods · Trial registration')).toBe(false);
  expect(validProposal(claimA,claimB,'same-study','Too short','Methods · Table 2')).toBe(false);
  expect(validReviewNote('Independent source-based approval of identical study identity.')).toBe(true);
  expect(validReviewNote('not clear')).toBe(false);
 });
 it('uses the narrow authenticated RPC, no browser-declared researcher roles, and preserves optimistic revision',async()=>{
  const bodies:Record<string,unknown>[]=[];
  const transport=vi.fn(async (_url:string,init?:RequestInit)=>{
   const body=JSON.parse(String(init?.body));bodies.push(body);
   if(body.p_action==='list')return new Response(JSON.stringify({
    source:'nfq-study-adjudication-v1',total:1,records:[proposal]
   }),{status:200});
   return new Response(JSON.stringify({
    source:'nfq-study-adjudication-v1',id:adjudicationId,revision:1,
    status:body.p_action==='propose'?'pending':'approved'
   }),{status:200});
  });
  const service=createStudyAdjudicationsService(
   config,{getAccessToken:async()=>token},transport as typeof fetch);
  expect(await service.list(snapshot)).toHaveLength(1);
  await service.propose(claimB,claimA,'same-study',
   'Both papers describe one registered clinical trial in the source.',
   'Original Methods · Trial registration',0);
  await service.review(adjudicationId,'approve',
   'Independent review verifies matching registered study identity.',1);
  expect(bodies.map(x=>x.p_action)).toEqual(['list','propose','review']);
  expect(bodies[1].p_expected_revision).toBe(0);
  expect(bodies[2].p_expected_revision).toBe(1);
  expect(bodies.every(x=>!('role' in x)&&!('user_id' in x))).toBe(true);
  expect(transport).toHaveBeenCalledTimes(3);
 });
 it('never makes a remote request without the current live user session',async()=>{
  const transport=vi.fn();
  const service=createStudyAdjudicationsService(
   config,{getAccessToken:async()=>null},transport as typeof fetch);
  await expect(service.list(snapshot)).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
 it('propagates stale pair revision errors without pretending a review was accepted',async()=>{
  const service=createStudyAdjudicationsService(
   config,{getAccessToken:async()=>token},
   vi.fn(async()=>new Response('{}',{status:409})) as typeof fetch);
  await expect(service.review(adjudicationId,'approve',
   'Independent analysis of the source supports an unchanged study.',1))
   .rejects.toThrow('Refresh');
 });
});
