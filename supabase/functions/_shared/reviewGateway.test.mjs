import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewGateway,createSupabaseVerifier,decodeReviewCommand} from './reviewGateway.mjs';
const userId='11111111-1111-4111-8111-111111111111', sessionId='22222222-2222-4222-8222-222222222222';
const claim=Buffer.from(JSON.stringify({sub:userId,session_id:sessionId,role:'authenticated',iss:'https://cftr.supabase.co/auth/v1',exp:Math.ceil(Date.now()/1000)+300})).toString('base64url');
const token='eyJhbGciOiJIUzI1NiJ9.'+claim+'.signature';
const origin='https://fq.neumact.org';
const body={decisionId:'NFQ-NOM-101',revision:1,expectedVersion:0,action:'submit',
 idempotencyKey:'new-submit-0101',rationale:'Source-based proposal to review'};
const request=(payload=body,headers={})=>new Request('https://example.supabase.co/functions/v1/nfq-review',{method:'POST',
 headers:{origin,'content-type':'application/json',authorization:'Bearer '+token,...headers},body:JSON.stringify(payload)});
const ok={decisionId:'NFQ-NOM-101',revision:1,version:1,phase:'under-review',eventId:'private',replayed:false};
test('input allows bounded commands but no user-supplied actor, role claims, JWT or verified evidence',()=>{
 assert.equal(decodeReviewCommand({...body,userId}),null);
 assert.equal(decodeReviewCommand({...body,role:'scientific'}),null);
 assert.equal(decodeReviewCommand({...body,revision:-1}),null);
 assert.equal(decodeReviewCommand({...body,idempotencyKey:'short'}),null);
 assert.equal(decodeReviewCommand({...body,rationale:'x'}),null);
 assert.equal(decodeReviewCommand({...body,action:'review',vote:'approve',role:'scientific'}).action,'review');
 assert.equal(decodeReviewCommand({...body,action:'release'}).action,'release');
});
test('disabled handler refuses all write requests before looking up a user',async()=>{
 let verified=false;
 const handler=createReviewGateway({allowedOrigin:origin,verifyUser:async()=>{verified=true;return {userId,sessionId}},execute:async()=>ok});
 const response=await handler(request());
 assert.equal(response.status,503);assert.equal(verified,false);
});
test('enabled server accepts only verified actor plus exact origin; hides internal output',async()=>{
 const observed=[];
 const handle=createReviewGateway({enabled:true,allowedOrigin:origin,verifyUser:async jwt=>{
  observed.push(jwt);return {userId,sessionId};},execute:async(actor,command)=>{
   observed.push(actor,command);return ok;}});
 const response=await handle(request());
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{decisionId:ok.decisionId,revision:1,version:1,phase:'under-review',replayed:false});
 assert.equal(observed[0],token);assert.deepEqual(observed[1],{userId,sessionId});
 assert.equal(observed[2].action,'submit');
 assert.equal(response.headers.get('access-control-allow-origin'),origin);
 assert.equal((await handle(request(body,{origin:'https://attacker.example'}))).status,403);
 assert.equal((await handle(request(body,{authorization:'Bearer fake'}))).status,401);
 assert.equal((await handle(request({...body,actor:userId}))).status,400);
});
test('release is independently disabled, and invalid request bodies fail closed',async()=>{
 const handle=createReviewGateway({enabled:true,allowedOrigin:origin,verifyUser:async()=>({userId,sessionId}),execute:async()=>ok});
 assert.equal((await handle(request({...body,action:'release'}))).status,403);
 assert.equal((await handle(request({...body,action:'review',role:'scientific'}))).status,400);
 assert.equal((await handle(request(body,{'content-type':'text/plain'}))).status,415);
 const huge='x'.repeat(4100);
 assert.equal((await handle(request({...body,rationale:huge}))).status,400);
});
test('mismatched or missing verified actor cannot write; execution is never invoked',async()=>{
 let invoked=0;
 const handle=createReviewGateway({enabled:true,allowedOrigin:origin,verifyUser:async()=>null,execute:async()=>{invoked++;return ok;}});
 assert.equal((await handle(request())).status,401);assert.equal(invoked,0);
});
test('SQL rejects and outages are mapped without leaking text',async()=>{
 for(const [code,status] of [['42501',403],['40001',409],['23505',409],['23514',422],['XX000',503]]){
  const handle=createReviewGateway({enabled:true,allowedOrigin:origin,
   verifyUser:async()=>({userId,sessionId}),execute:async()=>{throw Object.assign(new Error('sensitive SQL'),{code})}});
  const response=await handle(request());
  assert.equal(response.status,status);
  assert.ok(!(await response.text()).includes('sensitive'));
 }
});
test('Supabase Auth uses the actual token, matches identity and issuer, not user_metadata',async()=>{
 let count=0;
 const transport=async(url,init)=>{
  count++;
  assert.equal(url,'https://cftr.supabase.co/auth/v1/user');
  assert.equal(init.headers.Authorization,'Bearer '+token);
  return new Response(JSON.stringify({id:userId,email_confirmed_at:'2026-01-01T00:00:00Z',user_metadata:{role:'admin'}}),{status:200});
 };
 const verify=createSupabaseVerifier({authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',transport});
 assert.deepEqual(await verify(token),{userId,sessionId});assert.equal(count,1);
});
test('Auth identity mismatch, revoked/invalid token and missing confirmed email fail closed',async()=>{
 for(const response of [
  new Response('{}',{status:401}),
  new Response(JSON.stringify({id:'33333333-3333-4333-8333-333333333333',email_confirmed_at:'2026-01-01'})),
  new Response(JSON.stringify({id:userId,email_confirmed_at:null})),
  new Response(JSON.stringify({id:userId,email_confirmed_at:'2026-01-01',is_anonymous:true}))
 ]){
  const verify=createSupabaseVerifier({authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',transport:async()=>response.clone()});
  assert.equal(await verify(token),null);
 }
});

test('strict submission boundary cannot be relabeled as scientific review or release',async()=>{
 let calls=0;
 const gate=createReviewGateway({enabled:true,allowedOrigin:origin,allowedAction:'submit',
  verifyUser:async()=>({userId,sessionId}),execute:async()=>{calls++;return ok;}});
 const bad={...body,action:'review',role:'scientific',vote:'approve'};
 assert.equal((await gate(request(bad))).status,403);
 assert.equal((await gate(request({...body,action:'release'}))).status,403);
 assert.equal(calls,0);
 const response=await gate(request(body));
 assert.equal(response.status,200);
 assert.equal(calls,1);
});

test('Supabase Auth rejects oversized or malformed tokens before any network access',async()=>{
 let calls=0;
 const verify=createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',
  publishableKey:'sb_publishable_demo',
  transport:async()=>{calls++;return new Response('{}',{status:401});}
 });
 for(const value of [null,42,'not-a-jwt','abc.def','x'.repeat(5000),token+' extra']){
  assert.equal(await verify(value),null);
 }
 assert.equal(calls,0);
});
test('Supabase Auth requests are abortable and bounded when the provider stalls',async()=>{
 let signal;
 const verify=createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',
  authTimeoutMs:30,
  transport:async (_url,init)=>{
   signal=init.signal;
   assert.equal(init.method,'GET');
   assert.equal(init.cache,'no-store');
   return new Promise((_resolve,reject)=>{
    if(init.signal.aborted){reject(init.signal.reason);return;}
    init.signal.addEventListener('abort',()=>reject(init.signal.reason),{once:true});
   });
  }
 });
 // AbortSignal.timeout uses an unref'd timer in Node. The mocked
 // transport does not own a socket, so give CI a brief referenced timer.
 const keepalive=setTimeout(()=>{},250);
 try{
  await assert.rejects(verify(token));
  assert.ok(signal.aborted);
 }finally{clearTimeout(keepalive)}
});
test('invalid Auth timeout configuration is refused before any provider request',()=>{
 for(const ms of [0,9,10001,-1,NaN,'5000']){
  assert.throws(()=>createSupabaseVerifier({
   authOrigin:'https://cftr.supabase.co',
   publishableKey:'sb_publishable_demo',authTimeoutMs:ms
  }),/Invalid Auth timeout/);
 }
});

test('Auth 200 with oversized declared response is rejected before parsing',async()=>{
 const user={id:userId,email_confirmed_at:'2026-01-01T00:00:00Z'};
 const verify=createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',
  transport:async()=>new Response(JSON.stringify(user),{
   status:200,headers:{'content-length':'65537'}
  })
 });
 await assert.rejects(verify(token),/Auth unavailable/);
});
test('Auth streamed response exceeding 64 KiB is canceled and never accepted',async()=>{
 let canceled=false;
 const verify=createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',
  transport:async()=>new Response(new ReadableStream({
   start(controller){controller.enqueue(new Uint8Array(65537));},
   cancel(){canceled=true;}
  }),{status:200})
 });
 await assert.rejects(verify(token),/Auth unavailable/);
 assert.equal(canceled,true);
});
test('Auth response parsing rejects invalid UTF-8 and malformed JSON',async()=>{
 const verifyWithBody=body=>createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',
  transport:async()=>new Response(body,{status:200})
 });
 await assert.rejects(verifyWithBody(new Uint8Array([0xff,0xfe]))(token),/Auth unavailable/);
 await assert.rejects(verifyWithBody('{"id":')(token),/Auth unavailable/);
});
test('bounded Auth parsing retains valid matching Supabase user identity',async()=>{
 const user={id:userId,email_confirmed_at:'2026-01-01T00:00:00Z'};
 const verify=createSupabaseVerifier({
  authOrigin:'https://cftr.supabase.co',publishableKey:'sb_publishable_demo',
  transport:async()=>new Response(JSON.stringify(user),{status:200})
 });
 assert.deepEqual(await verify(token),{userId,sessionId});
});
