// Disposable GitHub Actions Postgres 17 + Deno only. No Supabase connection.
// Executes the ACTUAL Helios HTTP gateway against a real least-privilege
// transport login and actual isolated review-stage PostgreSQL functions.
// JWT signatures are NOT tested: verifyUser is a CI-only stub. Never expose
// this fixture endpoint or role/password outside the disposable runner.
import postgres from 'npm:postgres@3.4.7';
import {createReviewQueueGateway} from '../../supabase/functions/_shared/reviewQueueGateway.mjs';
import {createPrivateReviewQueueReader} from '../../supabase/functions/_shared/privateReviewQueueReader.mjs';

const assert=(ok,description)=>{if(!ok)throw new Error(description);};
if(!['127.0.0.1','localhost'].includes(Deno.env.get('PGHOST')||''))
 throw new Error('Refusing non-loopback database target');
if(Deno.env.get('PGDATABASE')!=='review_test')
 throw new Error('Refusing non-disposable database');
const port=Deno.env.get('PGPORT')||'5432';
const url=new URL('postgres://127.0.0.1/review_test');
url.port=port;
url.username='nfq_review_transport';
url.password='ci-disposable-only';
const db=postgres(url.toString(),{max:1,prepare:false,connect_timeout:3,idle_timeout:2});
const reader=createPrivateReviewQueueReader({
 withTransaction:work=>db.begin(async tx=>
  work(async(statement,values)=>Array.from(await tx.unsafe(statement,values))))
});
const reviewer={userId:'11111111-1111-4111-8111-111111111113',
 sessionId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
const contributor={userId:'11111111-1111-4111-8111-111111111111',
 sessionId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const revokedReviewer={userId:'11111111-1111-4111-8111-111111111112',
 sessionId:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'};
const outsiders={userId:'11111111-1111-4111-8111-111111111119',
 sessionId:'ffffffff-ffff-4fff-8fff-ffffffffffff'};
// No privileged identity/role can be supplied in query params or body.
const tokens={
 'reviewer':reviewer,'contributor':contributor,
 'revoked':revokedReviewer,'outsider':outsiders
};
const handler=createReviewQueueGateway({
 enabled:true, // CI harness only, not Edge Function configuration
 allowedOrigin:'https://fq.neumact.org',
 verifyUser:async token=>tokens[token.split('.')[1]]??null,
 readQueue:reader
});
let httpPort=0;
const server=Deno.serve({hostname:'127.0.0.1',port:0,
 onListen:({port})=>{httpPort=port;}},request=>handler(request));
let counter=0;
const get=async (who='reviewer',path='',overrides={})=>{
 counter++;
 const token='eyJhbGciOiJIUzI1NiJ9.'+who+'.signature';
 return fetch('http://127.0.0.1:'+httpPort+'/review-queue'+path,{
  method:overrides.method||'GET',
  headers:{Origin:'https://fq.neumact.org',
   Authorization:'Bearer '+token,...(overrides.headers||{})}
 });
};
try{
 assert(httpPort>0,'HTTP server failed to bind loopback port');
 let response=await get();
 assert(response.status===200,'Eligible reviewer was not authorized ('+response.status+')');
 assert(response.headers.get('cache-control')==='no-store','Private cache-control missing');
 let data=await response.json();
 assert(data.offset===0&&Array.isArray(data.items)&&data.items.length>0,
  'Expected real in-memory PostgreSQL review fixtures, not fabricated API rows');
 for(const item of data.items){
  assert(Object.keys(item).sort().join(',')===
   ['createdAt','decisionId','kind','phase','revision','version'].sort().join(','),
   'Response exposed private reviewer/proposer/evidence fields');
 }
 for(const who of ['contributor','revoked','outsider']){
  response=await get(who);
  assert(response.status===403,who+' unexpectedly viewed private queue '+response.status);
  data=await response.json();
  assert(!JSON.stringify(data).includes('00000000'),'HTTP denied response leaks identities');
 }
 response=await get('reviewer','?offset=20');
 assert(response.status===200,'Valid pagination failed');
 response=await get('reviewer','?offset=1');
 assert(response.status===400,'Invalid offset accepted');
 response=await get('reviewer','?role=administrator');
 assert(response.status===400,'Client-supplied role query accepted');
 response=await get('reviewer','',{method:'POST'});
 assert(response.status===405,'HTTP endpoint allowed writes');
 response=await get('reviewer','',{headers:{Origin:'https://hostile.example'}});
 assert(response.status===403,'Cross-origin review request accepted');
 response=await get('invalid');
 assert(response.status===401,'Invalid bearer was accepted');
 // Membership revocation must take effect immediately even on the SAME
 // single physical transport connection (no cached membership or actor).
 // Revoke through the test-only owner connection; NOT a production action.
 const admin=postgres({
  host:'127.0.0.1',port:Number(port),database:'review_test',
  username:'postgres',password:'disposable-test-only',
  max:1,prepare:false
 });
 try{
  await admin.unsafe(
   "UPDATE public.nfq_research_memberships SET revoked_at=now() WHERE user_id=$1::uuid",
   [reviewer.userId]);
  response=await get();
  assert(response.status===403,'Revoked reviewer still has queue access');
  await admin.unsafe(
   "DELETE FROM auth.sessions WHERE id=$1::uuid",[reviewer.sessionId]);
  response=await get();
  assert(response.status===403,'Revoked session retained review access');
  // No queue requests are allowed to create reviews/events in the first place.
  const verdict=await admin.unsafe(
   "SELECT COUNT(*)::int AS n FROM review_stage.reviews WHERE decision_id='NFQ-NOM-103'");
  assert(verdict[0].n===0,'GET review queue mutated a scientific review');
 }finally{await admin.end({timeout:2});}
 console.log('PASS: real-loopback HTTP + private PostgreSQL reviewer queue, '+counter+' requests, no writes');
}finally{
 await server.shutdown();
 await db.end({timeout:2});
}
