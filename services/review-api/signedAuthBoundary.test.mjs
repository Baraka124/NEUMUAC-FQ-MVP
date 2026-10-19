/**
 * Phase 14G8A: A local, cryptographically signed Auth-provider double.
 * Test ONLY. Uses a synthetic HMAC secret never connected to Supabase.
 * Signature verification happens in the Auth transport, not by decoding the
 * JWT in the review API; the real API must use Supabase's trusted /user.
 */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHmac,timingSafeEqual} from 'node:crypto';
import {createReviewService} from './composition.mjs';

const project='abcdefghijklmnopqrst';
const issuer='https://'+project+'.supabase.co/auth/v1';
const origin='https://fq.neumact.org';
const user='11111111-1111-4111-8111-111111111111';
const session='22222222-2222-4222-8222-222222222222';
const secret='only-test-hmac-key--never-used-for-production-credentials';
const env={
 NFQ_REVIEW_SERVICE_ENABLED:'true',
 NFQ_REVIEW_EXECUTION_SCOPE:'isolated-testing',
 NFQ_REVIEW_ALLOWED_ORIGIN:origin,
 NFQ_SUPABASE_AUTH_ORIGIN:'https://'+project+'.supabase.co',
 NFQ_SUPABASE_AUTH_PUBLIC_KEY:'sb_publishable_local_fixture',
 NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:synthetic@db.'+project+'.supabase.co/postgres?sslmode=require',
 NFQ_REVIEW_QUEUE_ENABLED:'true',
 NFQ_REVIEW_SUBMISSIONS_ENABLED:'true',
 NFQ_REVIEW_DECISIONS_ENABLED:'false'
};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
function sign(payload){
 const header=encode({alg:'HS256',typ:'JWT'});
 const content=encode(payload);
 const signed=header+'.'+content;
 const mac=createHmac('sha256',secret).update(signed).digest('base64url');
 return signed+'.'+mac;
}
function verifiedAuthTransport({deny=false}={}){
 const transport=async (address,options)=>{
  assert.equal(address,issuer.replace('/auth/v1','')+'/auth/v1/user');
  assert.equal(options.method,'GET');
  assert.equal(options.cache,'no-store');
  assert.equal(options.credentials,'omit');
  const tok=(options.headers.Authorization||'').replace(/^Bearer /,'');
  const [h,b,mac,extra]=tok.split('.');
  if(deny||extra!==undefined||!h||!b||!mac)
   return new Response('{}',{status:401});
  const expected=createHmac('sha256',secret).update(h+'.'+b).digest();
  let presented,header,claims;
  try{
   presented=Buffer.from(mac,'base64url');
   header=JSON.parse(Buffer.from(h,'base64url').toString());
   claims=JSON.parse(Buffer.from(b,'base64url').toString());
  }catch{return new Response('{}',{status:401})}
  if(presented.length!==expected.length||!timingSafeEqual(expected,presented)||
     header.alg!=='HS256'||claims.iss!==issuer||claims.role!=='authenticated'||
     claims.exp<=Math.floor(Date.now()/1000))
   return new Response('{}',{status:401});
  return new Response(JSON.stringify({
   id:claims.sub,email_confirmed_at:'2026-10-01T11:00:00Z',
   user_metadata:{role:'administrator',can_approve_all:true}
  }),{status:200,headers:{'content-type':'application/json'}});
 };
 return transport;
}
const claims={
 iss:issuer,sub:user,session_id:session,role:'authenticated',
 exp:Math.floor(Date.now()/1000)+300
};
const request=(base,token)=>fetch(base+'/v1/helios/reviews?offset=0',{
 method:'GET',headers:{Origin:origin,Authorization:'Bearer '+token}
});
async function serve({transport=verifiedAuthTransport(),active=true}={},fn){
 const seen=[];
 const service=createReviewService({
  environment:{...env,NFQ_REVIEW_QUEUE_ENABLED:active?'true':'false'},
  authTransport:transport,
  databaseTransaction:async work=>{
   return work(async (query,args)=>{
    seen.push({query,args});
    if(query==='SET LOCAL ROLE nfq_review_executor')return [];
    if(query.includes('auth.sessions')){
     if(args[0]!==session||args[1]!==user)return [];
     return [{one:1}];
    }
    if(query.includes("set_config('request.jwt.claim.sub'"))return [{}];
    if(query.includes('review_stage.review_queue'))return [{
     payload:{items:[],hasMore:false,offset:0,callerInternal:'omit'}
    }];
    throw new Error('Unexpected SQL call');
   });
  }
 });
 await new Promise(resolve=>service.server.listen(0,'127.0.0.1',resolve));
 try{return await fn('http://127.0.0.1:'+service.server.address().port,seen)}
 finally{await new Promise((resolve,reject)=>service.server.close(error=>error?reject(error):resolve()))}
}
test('signed fixture flows through authenticating Auth transport and private PG session scope',async()=>{
 await serve({},async(base,seen)=>{
  const reply=await request(base,sign(claims));
  assert.equal(reply.status,200);
  assert.deepEqual(await reply.json(),{items:[],hasMore:false,offset:0});
  assert.deepEqual(seen.map(x=>x.query),[
   'SET LOCAL ROLE nfq_review_executor',
   'SELECT 1 FROM auth.sessions WHERE id=$1::uuid AND user_id=$2::uuid AND (not_after IS NULL OR not_after>now()) LIMIT 1',
   "SELECT set_config('request.jwt.claim.sub',$1,true)",
   'SELECT review_stage.review_queue($1) AS payload'
  ]);
  assert.deepEqual(seen[1].args,[session,user]);
 });
});
test('tampered token payload and changed signature cannot pass Auth',async()=>{
 await serve({},async(base,seen)=>{
  const valid=sign(claims);
  const tampered=valid.split('.');
  tampered[1]=encode({...claims,sub:'33333333-3333-4333-8333-333333333333'});
  for(const tok of [tampered.join('.'),valid.slice(0,-2)+'aa']){
   const response=await request(base,tok);
   assert.equal(response.status,401);
  }
  assert.equal(seen.length,0);
 });
});
test('signed expiry, wrong issuer, missing or mismatched session are denied',async()=>{
 await serve({},async(base,seen)=>{
  for(const payload of [
   {...claims,exp:Math.floor(Date.now()/1000)-5},
   {...claims,iss:'https://attacker.supabase.co/auth/v1'},
   {...claims,session_id:'44444444-4444-4444-8444-444444444444'},
   {...claims,session_id:null}
  ]){
   const response=await request(base,sign(payload));
   assert.equal(response.status,[...String(payload.session_id||'')].length===36&&payload.iss===issuer&&payload.exp>Math.floor(Date.now()/1000)?403:401);
  }
  assert.equal(seen.some(x=>x.query.includes('review_stage.review_queue')),false);
 });
});
test('Auth token invalidation disables queue without trusting user_metadata privilege claims',async()=>{
 await serve({transport:verifiedAuthTransport({deny:true})},async(base,seen)=>{
  const result=await request(base,sign(claims));
  assert.equal(result.status,401);assert.equal(seen.length,0);
 });
 await serve({active:false},async(base,seen)=>{
  const result=await request(base,sign(claims));
  assert.equal(result.status,503);assert.equal(seen.length,0);
 });
});
