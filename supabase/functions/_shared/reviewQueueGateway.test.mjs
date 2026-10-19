import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewQueueGateway,decodeReviewQueuePage} from './reviewQueueGateway.mjs';
import {createPrivateReviewQueueReader} from './privateReviewQueueReader.mjs';
const actor={userId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222'};
const token='eyJhbGciOiJIUzI1NiJ9.e30.signature';
const origin='https://fq.neumact.org';
const item={decisionId:'NFQ-NOM-101',revision:1,kind:'alias-equivalence',phase:'under-review',version:3,createdAt:'2026-10-19T00:00:00Z'};
const page={items:[item],hasMore:false,offset:0};
const req=(path='',args={})=>new Request('https://example.supabase.co/functions/v1/nfq-review-queue'+path,{
 method:args.method||'GET',headers:{origin,authorization:'Bearer '+token,...args.headers}
});
test('queue payload decoder projects only allowed metadata and fails closed on malformed records',()=>{
 const val=decodeReviewQueuePage({...page,items:[{...item,proposer_id:'private',rationale:'secret'}]},0);
 assert.deepEqual(val,page);assert.equal(JSON.stringify(val).includes('private'),false);
 for(const invalid of [
  {...page,items:[{...item,decisionId:'33'}]}, {...page,items:[{...item,phase:'draft'}]},
  {...page,items:[{...item,createdAt:'yesterday'}]}, {...page,items:[item,item]},
  {...page,offset:20},{...page,hasMore:true}, {...page,items:Array(21).fill(item)}
 ])assert.equal(decodeReviewQueuePage(invalid,0),null);
});
test('gateway denies by default, hostile origin, POST, and unauthorized JWT',async()=>{
 let invoked=false;
 const gateway=createReviewQueueGateway({allowedOrigin:origin,verifyUser:async()=>{invoked=true;return actor;},readQueue:async()=>page});
 assert.equal((await gateway(req())).status,503);assert.equal(invoked,false);
 const live=createReviewQueueGateway({enabled:true,allowedOrigin:origin,verifyUser:async()=>actor,readQueue:async()=>page});
 assert.equal((await live(req('',{headers:{origin:'https://attacker.example'}}))).status,403);
 assert.equal((await live(req('',{method:'POST'}))).status,405);
 assert.equal((await live(req('',{headers:{authorization:'Bearer bogus'}}))).status,401);
 assert.equal((await live(req('?offset=1'))).status,400);
 assert.equal((await live(req('?offset=0&role=admin'))).status,400);
});
test('verified scope/offset reaches private queue and excludes its extra sensitive fields',async()=>{
 let seen;
 const live=createReviewQueueGateway({enabled:true,allowedOrigin:origin,verifyUser:async()=>actor,
 readQueue:async(principal,offset)=>{seen={principal,offset};return {...page,items:[{...item,claimedBy:'secret'}]};}});
 const response=await live(req('?offset=0'));
 assert.equal(response.status,200);
 assert.deepEqual(seen,{principal:actor,offset:0});
 const body=await response.json();
 assert.deepEqual(body,page);assert.equal(response.headers.get('cache-control'),'no-store');
 assert.equal(JSON.stringify(body).includes('secret'),false);
});
test('denied/revoked member and server outages do not expose identities or SQL',async()=>{
 for(const [code,status] of [['42501',403],['28000',403],['XX000',503]]){
  const live=createReviewQueueGateway({enabled:true,allowedOrigin:origin,verifyUser:async()=>actor,
   readQueue:async()=>{throw Object.assign(new Error('private details'),{code});}});
  const response=await live(req());assert.equal(response.status,status);
  assert.equal((await response.text()).includes('private'),false);
 }
});
test('private reader binds actor/offset inside one transaction; no client actor parameters',async()=>{
 const calls=[];
 const reader=createPrivateReviewQueueReader({withTransaction:async work=>work(async(sql,args)=>{
  calls.push([sql,args]);
  if(sql.startsWith('SELECT 1 FROM auth.sessions'))return [{}];
  if(sql.startsWith('SELECT review_stage.review_queue'))return [{payload:page}];
  return [];
 })});
 assert.deepEqual(await reader(actor,0),page);
 assert.equal(calls[0][0],'SET LOCAL ROLE nfq_review_executor');
 assert.deepEqual(calls[1][1],[actor.sessionId,actor.userId]);
 assert.deepEqual(calls[2][1],[actor.userId]);assert.deepEqual(calls[3][1],[0]);
});
test('reader refuses foreign/revoked session before accessing reviewer queue',async()=>{
 let writes=0;
 const reader=createPrivateReviewQueueReader({withTransaction:async work=>work(async(sql,args)=>{
  if(sql.includes('review_stage.review_queue'))writes++;
  return [];
 })});
 await assert.rejects(reader(actor,0),{code:'28000'});
 assert.equal(writes,0);
 await assert.rejects(reader(actor,19),{code:'22023'});
});
