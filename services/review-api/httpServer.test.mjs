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

const submission={decisionId:'NFQ-NOM-101',revision:1,expectedVersion:0,
 action:'submit',idempotencyKey:'submit-fixture-01',
 rationale:'Recorded source citation requires independent review'};
const submit=(base,body=submission,opts={})=>fetch(base+'/v1/helios/submissions'+(opts.path||''),{
 method:opts.method||'POST',headers:{origin,authorization:'Bearer '+token,
 'content-type':'application/json',...opts.headers},body:opts.method==='GET'?undefined:JSON.stringify(body)
});
test('contributor submit endpoint is independently disabled by default',async()=>{
 await withServer({enabled:true,verifyUser:async()=>actor,readQueue:async()=>({items:[],hasMore:false,offset:0})},
 async base=>{
  const res=await submit(base);
  assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'not_connected'});
  assert.equal((await get(base)).status,200);
 });
});
test('bounded submission accepts only a preverified decision submit command',async()=>{
 const observed=[];
 await withServer({submissionEnabled:true,verifyUser:async jwt=>{observed.push(jwt);return actor;},
  executeReview:async(principal,command)=>{observed.push(principal,command);
   return {decisionId:command.decisionId,revision:command.revision,version:1,phase:'under-review',replayed:false,eventId:'secret'};}},
 async base=>{
  const res=await submit(base);
  assert.equal(res.status,200);
  assert.deepEqual(await res.json(),{decisionId:'NFQ-NOM-101',revision:1,version:1,phase:'under-review',replayed:false});
  assert.equal(observed[0],token);assert.deepEqual(observed[1],actor);
  assert.equal(observed[2].action,'submit');
  assert.equal((await submit(base,{...submission,action:'review',role:'scientific',vote:'approve'})).status,403);
  assert.equal((await submit(base,{...submission,action:'release'})).status,403);
  assert.equal((await submit(base,{...submission,userId:actor.userId})).status,400);
  assert.equal((await submit(base,submission,{path:'?role=reviewer'})).status,400);
  assert.equal((await submit(base,submission,{method:'GET'})).status,405);
  assert.equal((await submit(base,submission,{headers:{origin:'https://other.example'}})).status,403);
  assert.equal(observed.length,3);
 });
});
test('submission refuses invalid credentials and very large bodies before execution',async()=>{
 let executed=0;
 await withServer({submissionEnabled:true,verifyUser:async()=>actor,
  executeReview:async()=>{executed++;return {decisionId:'NFQ-NOM-101',revision:1,version:1,phase:'under-review'};}},
 async base=>{
  assert.equal((await submit(base,submission,{headers:{authorization:'Bearer wrong'}})).status,401);
  assert.equal((await submit(base,{...submission,rationale:'X'.repeat(6000)})).status,413);
  assert.equal(executed,0);
 });
});
