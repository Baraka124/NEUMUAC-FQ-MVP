import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createIsolatedReviewRuntime} from './start.mjs';
const env={
 NFQ_REVIEW_SERVICE_ENABLED:'true',
 NFQ_REVIEW_EXECUTION_SCOPE:'isolated-testing',
 NFQ_REVIEW_ALLOWED_ORIGIN:'https://fq.neumact.org',
 NFQ_SUPABASE_AUTH_ORIGIN:'https://abcdefghijklmnopqrst.supabase.co',
 NFQ_SUPABASE_AUTH_PUBLIC_KEY:'sb_publishable_test',
 NFQ_REVIEW_TRANSPORT_DSN:'postgres://nfq_review_transport:disposable-only@db.abcdefghijklmnopqrst.supabase.co/postgres?sslmode=require',
 NFQ_REVIEW_QUEUE_ENABLED:'true',PORT:'0'
};
const fakePool=()=>({
 begin:async task=>task({unsafe:async statement=>{
  if(statement.includes('auth.sessions'))return [];
  throw new Error('This synthetic CI test must not reach a review action');
 }}),
 end:async()=>{}
});
test('refuses to start without explicit isolated activation or with Railway runtime',()=>{
 assert.throws(()=>createIsolatedReviewRuntime({environment:{},postgresFactory:fakePool}));
 assert.throws(()=>createIsolatedReviewRuntime({
  environment:{...env,RAILWAY_ENVIRONMENT:'production'},postgresFactory:fakePool
 }),/not authorized/);
 assert.throws(()=>createIsolatedReviewRuntime({
  environment:{...env,RAILWAY_PROJECT_ID:'abc'},postgresFactory:fakePool
 }),/not authorized/);
 assert.throws(()=>createIsolatedReviewRuntime({
  environment:{...env,NFQ_REVIEW_EXECUTION_SCOPE:'production'},postgresFactory:fakePool
 }));
});
test('only narrow transport string and fixed options reach postgres adapter',async()=>{
 let observed;
 const runtime=createIsolatedReviewRuntime({
  environment:env,
  postgresFactory:(dsn,options)=>{observed={dsn,options};return fakePool()},
  authTransport:async()=>new Response('{}',{status:401})
 });
 assert.equal(observed.dsn,env.NFQ_REVIEW_TRANSPORT_DSN);
 assert.deepEqual(observed.options,{
  max:1,prepare:false,connect_timeout:5,idle_timeout:10,ssl:'require'
 });
 try{
  const address=await runtime.listen();
  assert.equal(address.address,'127.0.0.1');
  const base='http://127.0.0.1:'+address.port;
  const health=await fetch(base+'/healthz');
  assert.equal(health.status,200);
  assert.deepEqual(await health.json(),{status:'ok'});
  const denied=await fetch(base+'/v1/helios/reviews',{
   headers:{Origin:'https://fq.neumact.org',Authorization:'Bearer bad'}
  });
  assert.equal(denied.status,401);
  const write=await fetch(base+'/v1/helios/submissions',{
   method:'POST',headers:{Origin:'https://fq.neumact.org'}
  });
  assert.equal(write.status,503);
 }finally{await runtime.close()}
});
test('isolated process cannot bind a nonnumeric or over-range port',async()=>{
 for(const value of ['0.0.0.0','70000','-1','443evil']){
  const runtime=createIsolatedReviewRuntime({
   environment:{...env,PORT:value},postgresFactory:fakePool
  });
  try{await assert.rejects(runtime.listen())}finally{await runtime.close()}
 }
});
