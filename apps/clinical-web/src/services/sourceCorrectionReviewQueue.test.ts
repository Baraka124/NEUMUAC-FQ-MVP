import {describe,it,expect,vi} from 'vitest';
import {canReadSourceReviewQueue,createSourceReviewQueue,decodeSourceReviewQueue} from './sourceCorrectionReviewQueue';
const user='8ac7177e-4a91-4e69-a327-3709cb782117';
const row={id:3,reference_id:12,variant_id:42,field_name:'title',recorded_value:'Original',
 proposed_value:'Corrected source title',rationale:'This publication has a corrected title.',status:'submitted',
 created_by:user,created_at:'2026-11-05T12:00:00Z'};
const config={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){return {state:{phase:'signed-in',userId:user},getAccessToken:vi.fn(async()=> 'user-token')};}
describe('source-correction review queue',()=>{
 it('is gated to verified reviewer or administrator',()=>{
  expect(canReadSourceReviewQueue(true,'signed-in',{phase:'verified',role:'reviewer'})).toBe(true);
  expect(canReadSourceReviewQueue(true,'signed-in',{phase:'verified',role:'administrator'})).toBe(true);
  expect(canReadSourceReviewQueue(true,'signed-in',{phase:'verified',role:'contributor'})).toBe(false);
  expect(canReadSourceReviewQueue(false,'signed-in',{phase:'verified',role:'reviewer'})).toBe(false);
  expect(canReadSourceReviewQueue(true,'signed-in',{phase:'checking',role:null})).toBe(false);
 });
 it('accepts only recorded, distinct, pending proposals',()=>{
  expect(decodeSourceReviewQueue([row])).toMatchObject([{id:'3',referenceId:'12',variantId:'42',field:'title'}]);
  expect(()=>decodeSourceReviewQueue([{...row,status:'accepted'}])).toThrow();
  expect(()=>decodeSourceReviewQueue([row,row])).toThrow();
  expect(()=>decodeSourceReviewQueue([{...row,reference_id:0}])).toThrow();
  expect(()=>decodeSourceReviewQueue([{...row,created_by:'unverified'}])).toThrow();
  expect(()=>decodeSourceReviewQueue(Array(22).fill(row))).toThrow();
 });
 it('uses the signed-in user token and a read-only scoped GET',async()=>{
  const request=vi.fn(async()=>new Response(JSON.stringify([row]),{status:200}));
  const queue=createSourceReviewQueue(config,session() as any,request as any);
  expect(await queue.list()).toHaveLength(1);
  const [url,init]=request.mock.calls[0];
  const parsed=new URL(url);
  expect(parsed.pathname).toBe('/rest/v1/nfq_source_correction_proposals');
  expect(parsed.searchParams.get('status')).toBe('eq.submitted');
  expect(init.method).toBe('GET');
  expect(init).not.toHaveProperty('body');
 });
 it('does not dispatch when sign-in is missing or changed during refresh',async()=>{
  const userSession=session();userSession.state.phase='signed-out';
  const request=vi.fn();
  await expect(createSourceReviewQueue(config,userSession as any,request as any).list())
   .rejects.toMatchObject({kind:'sign-in-required'});
  expect(request).not.toHaveBeenCalled();
  userSession.state.phase='signed-in';
  userSession.getAccessToken.mockImplementation(async()=>{userSession.state.userId='d71e38b6-3be3-426a-97a2-81b4cf4606b2';return 'new-token';});
  await expect(createSourceReviewQueue(config,userSession as any,request as any).list())
   .rejects.toMatchObject({kind:'sign-in-required'});
  expect(request).not.toHaveBeenCalled();
 });
 it('fails closed on a truncated page and access denial',async()=>{
  const many=Array.from({length:21},(_,i)=>({...row,id:i+1}));
  await expect(createSourceReviewQueue(config,session() as any,vi.fn(async()=>new Response(JSON.stringify(many),{status:200})) as any).list()).rejects.toMatchObject({kind:'unavailable'});
  await expect(createSourceReviewQueue(config,session() as any,vi.fn(async()=>new Response(null,{status:403})) as any).list()).rejects.toMatchObject({kind:'access-denied'});
 });
});
