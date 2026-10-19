import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createReviewService} from './composition.mjs';

// Test-only synthetic HTTP/JWT values. The trusted Auth endpoint is stubbed,
// so this does NOT validate a real Supabase cryptographic JWT signature.
const project='abcdefghijklmnopqrst';
const origin='https://fq.neumact.org';
const actor='11111111-1111-4111-8111-111111111111';
const session='22222222-2222-4222-8222-222222222222';
const config={
 NFQ_REVIEW_SERVICE_ENABLED:'true',
 NFQ_REVIEW_EXECUTION_SCOPE:'isolated-testing',
 NFQ_REVIEW_ALLOWED_ORIGIN:origin,
 NFQ_SUPABASE_AUTH_ORIGIN:'https://'+project+'.supabase.co',
 NFQ_SUPABASE_AUTH_PUBLIC_KEY:'sb_publishable_test_only',
 NFQ_REVIEW_TRANSPORT_DSN:
 'postgres://nfq_review_transport:disposable-only@db.'+project+'.supabase.co/postgres?sslmode=require',
 NFQ_REVIEW_QUEUE_ENABLED:'true',
 NFQ_REVIEW_SUBMISSIONS_ENABLED:'true',
 NFQ_REVIEW_DECISIONS_ENABLED:'true'
};
const encode=claim=>Buffer.from(JSON.stringify(claim)).toString('base64url');
const claims={
 sub:actor,role:'authenticated',session_id:session,
 iss:'https://'+project+'.supabase.co/auth/v1',
 exp:Math.floor(Date.now()/1000)+300
};
const token=(overrides={})=>'eyJhbGciOiJIUzI1NiJ9.'+encode({...claims,...overrides})+'.testingonly';
const submission={
 decisionId:'NFQ-NOM-101',revision:1,expectedVersion:0,action:'submit',
 idempotencyKey:'initial-submit-01',rationale:'Recorded research citation for independent evaluation'
};
const review={
 decisionId:'NFQ-NOM-101',revision:1,expectedVersion:1,action:'review',
 role:'scientific',vote:'approve',idempotencyKey:'review-check-01',
 rationale:'Independent source review of submitted research evidence'
};
async function withService({authStatus=200,authUser,allowSession=true,onSQL}={},fn){
 const seen={auth:[],sql:[]};
 const service=createReviewService({
  environment:config,
  authTransport:async(url,init)=>{
   seen.auth.push([url,init]);
   if(authStatus!==200)return new Response('{}',{status:authStatus});
   return new Response(JSON.stringify(authUser??{
    id:actor,email_confirmed_at:'2026-09-01T00:00:00Z',
    user_metadata:{role:'administrator',approved:true}
   }),{status:200,headers:{'content-type':'application/json'}});
  },
  databaseTransaction:async work=>{
   const events=[];
   const outcome=await work(async(sql,params)=>{
    events.push([sql,params]);seen.sql.push([sql,params]);
    if(sql==='SET LOCAL ROLE nfq_review_executor')return [];
    if(sql.includes('auth.sessions'))return allowSession?[{one:1}]:[];
    if(sql.includes("set_config('request.jwt.claim.sub'"))return [{}];
    if(sql.includes('review_stage.review_queue')){
     return [{payload:{items:[],offset:0,hasMore:false}}];
    }
    if(sql.includes('review_stage.review_command')){
     if(onSQL)return onSQL(sql,params);
     return [{outcome:{decisionId:params[0],revision:params[1],
      version:params[3]==='submit'?1:2,phase:'under-review',replayed:false,
      actorId:'private',sourceNotes:'never expose'}}];
    }
    throw new Error('Unexpected database query');
   });
   // Committing a simulated DB transaction happens only if work resolves.
   assert.equal(events[0][0],'SET LOCAL ROLE nfq_review_executor');
   return outcome;
  }
 });
 const server=service.server;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+server.address().port,seen)}
 finally{await new Promise((resolve,reject)=>server.close(err=>err?reject(err):resolve()))}
}
function req(base,route,accessToken,command){
 return fetch(base+route,{
  method:command?'POST':'GET',
  headers:{Origin:origin,Authorization:'Bearer '+accessToken,
   ...(command?{'content-type':'application/json'}:{})},
  ...(command?{body:JSON.stringify(command)}:{})
 });
}
test('full Node HTTP composes Auth user verification and current-session database check',async()=>{
 await withService({},async(base,seen)=>{
  const res=await req(base,'/v1/helios/submissions',token(),submission);
  assert.equal(res.status,200);
  const body=await res.json();
  assert.deepEqual(body,{decisionId:'NFQ-NOM-101',revision:1,
   version:1,phase:'under-review',replayed:false});
  assert.equal(seen.auth.length,1);
  assert.equal(seen.auth[0][0],config.NFQ_SUPABASE_AUTH_ORIGIN+'/auth/v1/user');
  assert.equal(seen.auth[0][1].headers.Authorization,'Bearer '+token());
  assert.ok(!JSON.stringify(body).includes('private'));
  const queries=seen.sql.map(x=>x[0]);
  assert.ok(queries[0].startsWith('SET LOCAL ROLE nfq_review_executor'));
  assert.ok(queries[1].includes('auth.sessions'));
  assert.ok(queries[2].includes("set_config('request.jwt.claim.sub'"));
  assert.ok(queries[3].includes('review_stage.review_command'));
  assert.deepEqual(seen.sql[1][1],[session,actor]);
  assert.deepEqual(seen.sql[2][1],[actor]);
  assert.deepEqual(seen.sql[3][1].slice(0,4),['NFQ-NOM-101',1,0,'submit']);
 });
});
test('server refuses JWT actor spoofing despite trusted-looking user_metadata',async()=>{
 await withService({},async(base,seen)=>{
  const bad=token({sub:'33333333-3333-4333-8333-333333333333'});
  const res=await req(base,'/v1/helios/submissions',bad,submission);
  assert.equal(res.status,401);
  assert.equal(seen.sql.length,0);
 });
});
test('server denies token from another Supabase issuer before touching DB',async()=>{
 await withService({},async(base,seen)=>{
  const bad=token({iss:'https://some-other.supabase.co/auth/v1'});
  const res=await req(base,'/v1/helios/reviews',bad);
  assert.equal(res.status,401);
  assert.equal(seen.sql.length,0);
 });
});
test('expired/anonymous/nonconfirmed auth and invalid live session fail closed',async()=>{
 const scenarios=[
  {t:token({exp:Math.floor(Date.now()/1000)-60}),status:401},
  {t:token(),authUser:{id:actor,email_confirmed_at:null},status:401},
  {t:token(),authStatus:401,status:401},
  {t:token(),allowSession:false,status:403}
 ];
 for(const scenario of scenarios){
  await withService(scenario,async(base,seen)=>{
   const res=await req(base,'/v1/helios/reviews/decisions',scenario.t,review);
   assert.equal(res.status,scenario.status);
   assert.equal(seen.sql.some(x=>x[0].includes('review_stage.review_command')),false);
  });
 }
});
test('read queue and reviewer actions share Auth but never accept browser role attribution',async()=>{
 await withService({},async(base,seen)=>{
  const q=await req(base,'/v1/helios/reviews',token());
  assert.equal(q.status,200);
  assert.deepEqual(await q.json(),{items:[],offset:0,hasMore:false});
  const reviewed=await req(base,'/v1/helios/reviews/decisions',token(),review);
  assert.equal(reviewed.status,200);
  assert.equal((await reviewed.json()).phase,'under-review');
  const forged=await req(base,'/v1/helios/reviews/decisions',token(),{
   ...review,reviewer_id:'44444444-4444-4444-8444-444444444444'
  });
  assert.equal(forged.status,400);
  assert.equal(seen.sql.filter(x=>x[0].includes('review_stage.review_command')).length,1);
 });
});
