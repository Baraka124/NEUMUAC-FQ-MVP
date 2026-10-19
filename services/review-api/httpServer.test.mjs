import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewHttpServer} from './httpServer.mjs';
const origin='https://fq.neumact.org';
const actor={userId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222'};
const entry={decisionId:'NFQ-NOM-101',kind:'alias-equivalence',phase:'under-review',
 revision:1,version:2,createdAt:'2026-10-19T00:00:00Z'};
const token='eyJhbGciOiJIUzI1NiJ9.e30.signature';
async function withServer(options,callback){
 const server=createReviewHttpServer(options);
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await callback('http://127.0.0.1:'+server.address().port);}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()));}
}
const get=(base,path='/v1/helios/reviews',opts={})=>fetch(base+path,{
 method:opts.method||'GET',
 headers:{origin,authorization:'Bearer '+token,...opts.headers}
});
test('no trusted adapters -> health passes but reviewer queue remains disabled',async()=>{
 await withServer({},async base=>{
  const health=await get(base,'/healthz');
  assert.equal(health.status,200);assert.equal(health.headers.get('cache-control'),'no-store');
  const queue=await get(base);
  assert.equal(queue.status,503);
  assert.deepEqual(await queue.json(),{error:'not_connected'});
 });
});
test('reuses the exact server review authorization contract with strict response projection',async()=>{
 const seen=[];
 await withServer({
  enabled:true,allowedOrigin:origin,verifyUser:async jwt=>{
   seen.push(jwt);return actor;
  },readQueue:async(principal,offset)=>{
   seen.push(principal,offset);
   return {items:[{...entry,actorId:'private',rationale:'confidential'}],
    hasMore:false,offset};
  }
 },async base=>{
  const ok=await get(base);
  assert.equal(ok.status,200);
  assert.equal(ok.headers.get('cache-control'),'no-store');
  assert.equal(ok.headers.get('access-control-allow-origin'),origin);
  const response=await ok.json();
  assert.deepEqual(response,{items:[entry],hasMore:false,offset:0});
  assert.equal(JSON.stringify(response).includes('confidential'),false);
  assert.equal(seen[0],token);assert.deepEqual(seen[1],actor);assert.equal(seen[2],0);
 });
});
test('GET-only, no cookie auth, no permissive CORS or dynamic endpoint routing',async()=>{
 let count=0;
 await withServer({
  enabled:true,allowedOrigin:origin,
  verifyUser:async()=>{count++;return actor;},
  readQueue:async()=>({items:[],hasMore:false,offset:0})
 },async base=>{
  assert.equal((await get(base,'/v1/helios/reviews',{method:'POST'})).status,405);
  assert.equal((await get(base,'/api/helios/reviews')).status,404);
  assert.equal((await get(base,'/v1/helios/reviews?role=administrator')).status,400);
  assert.equal((await get(base,'/v1/helios/reviews',{headers:{origin:'https://hostile.example'}})).status,403);
  assert.equal((await get(base,'/v1/helios/reviews',{headers:{authorization:'Bearer broken'}})).status,401);
  const preflight=await get(base,'/v1/helios/reviews',{method:'OPTIONS'});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-origin'),origin);
  assert.equal(count,0);
 });
});
test('revoked principal denied without revealing private failure or returning stale decisions',async()=>{
 await withServer({
  enabled:true,allowedOrigin:origin,verifyUser:async()=>actor,
  readQueue:async()=>{throw Object.assign(new Error('sensitive SQL'),{code:'42501'});}
 },async base=>{
  const res=await get(base);
  assert.equal(res.status,403);
  const body=await res.text();
  assert.equal(body.includes('sensitive'),false);
  assert.deepEqual(JSON.parse(body),{error:'access_denied'});
 });
});
