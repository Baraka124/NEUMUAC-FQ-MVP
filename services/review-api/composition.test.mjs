import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readReviewServiceConfig} from './reviewConfig.mjs';
import {createReviewService} from './composition.mjs';

const config={
 NFQ_REVIEW_SERVICE_ENABLED:'true',
 NFQ_REVIEW_EXECUTION_SCOPE:'isolated-testing',
 NFQ_REVIEW_ALLOWED_ORIGIN:'https://fq.neumact.org',
 NFQ_SUPABASE_AUTH_ORIGIN:'https://abcdefghijklmnopqrst.supabase.co',
 NFQ_SUPABASE_AUTH_PUBLIC_KEY:'sb_publishable_test_nonsecret',
 NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:disposable_ci_only@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=require'
};
test('fail-closed by default and no credentials needed for inactive service',()=>{
 assert.deepEqual(readReviewServiceConfig({}),{
  active:false,queue:false,submissions:false,decisions:false,
  allowedOrigin:'https://fq.neumact.org'
 });
 const service=createReviewService({environment:{}});
 assert.equal(service.active,false);
 service.server.closeAllConnections?.();
});
test('partial toggles, invalid enablement and production activation are refused',()=>{
 for(const vars of [
  {NFQ_REVIEW_SUBMISSIONS_ENABLED:'true'},
  {NFQ_REVIEW_QUEUE_ENABLED:'true'},
  {...config,NFQ_REVIEW_EXECUTION_SCOPE:'production'},
  {...config,NFQ_REVIEW_EXECUTION_SCOPE:'railway'},
  {...config,NFQ_REVIEW_ALLOWED_ORIGIN:'https://evil.example'},
  {...config,NFQ_SUPABASE_AUTH_ORIGIN:'http://abcdefghijklmnopqrst.supabase.co'},
  {...config,NFQ_SUPABASE_AUTH_ORIGIN:'https://other.supabase.co'},
  {...config,NFQ_REVIEW_TRANSPORT_DSN:'postgres://postgres:secret@db.abcdefghijklmnopqrst.supabase.co:5432/postgres'},
  {...config,NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:secret@db.differentproject123.supabase.co:5432/postgres'},
  {...config,NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:secret@evil.example/postgres'},
  {...config,NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:secret@db.abcdefghijklmnopqrst.supabase.co/postgres?sslmode=disable'}
 ]){
  assert.throws(()=>readReviewServiceConfig(vars));
 }
});
test('active integration strictly requires both trusted dependencies',()=>{
 assert.throws(()=>createReviewService({environment:config}),/required/);
 assert.equal(readReviewServiceConfig(config).active,true);
 assert.equal(readReviewServiceConfig({...config,NFQ_REVIEW_SUBMISSIONS_ENABLED:'true'}).submissions,true);
 assert.equal(readReviewServiceConfig({...config,NFQ_REVIEW_DECISIONS_ENABLED:'true'}).decisions,true);
});
test('queue and both mutating paths remain disabled when only service is enabled',async()=>{
 const integration=createReviewService({
  environment:config,
  authTransport:async()=>new Response(null,{status:401}),
  databaseTransaction:async()=>{throw new Error('No DB calls expected')}
 });
 assert.equal(integration.active,true);
 const server=integration.server;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base='http://127.0.0.1:'+server.address().port;
  for(const [path,method] of [
   ['/v1/helios/reviews','GET'],
   ['/v1/helios/submissions','POST'],
   ['/v1/helios/reviews/decisions','POST']
  ]){
   const res=await fetch(base+path,{method,headers:{origin:'https://fq.neumact.org',
    authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.e30.signature','content-type':'application/json'},
    ...(method==='POST'?{body:JSON.stringify({action:'submit'})}:{})});
   assert.equal(res.status,503);
   assert.deepEqual(await res.json(),{error:'not_connected'});
  }
 }finally{await new Promise(resolve=>server.close(resolve))}
});
