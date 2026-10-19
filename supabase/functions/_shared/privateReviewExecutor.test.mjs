import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateReviewExecutor} from './privateReviewExecutor.mjs';
const subject={userId:'11111111-1111-4111-8111-111111111111',
 sessionId:'22222222-2222-4222-8222-222222222222'};
const command={decisionId:'NFQ-NOM-101',revision:1,expectedVersion:0,
 action:'submit',role:null,vote:null,idempotencyKey:'submit-first-001',rationale:'Recorded research proposal'};
test('invokes only private command after active session in the same transaction',async()=>{
 const traces=[];
 const execute=createPrivateReviewExecutor({withTransaction:async work=>{
  traces.push('BEGIN');
  try{const value=await work(async(sql,args)=>{
    traces.push([sql,args]);
    if(sql.startsWith('SELECT 1 FROM auth.sessions'))return [{'?column?':1}];
    if(sql.startsWith('SELECT review_stage.review_command'))return [{outcome:{decisionId:command.decisionId,revision:1,version:1,phase:'under-review'}}];
    return [];
   });traces.push('COMMIT');return value;}
   catch(e){traces.push('ROLLBACK');throw e;}
 }});
 assert.equal((await execute(subject,command)).phase,'under-review');
 assert.equal(traces[0],'BEGIN');assert.equal(traces.at(-1),'COMMIT');
 assert.equal(traces[1][0],'SET LOCAL ROLE nfq_review_executor');
 assert.deepEqual(traces[2][1],[subject.sessionId,subject.userId]);
 assert.deepEqual(traces[3][1],[subject.userId]);
 assert.deepEqual(traces[4][1],[command.decisionId,1,0,'submit',null,null,command.idempotencyKey,command.rationale]);
 assert.ok(!traces[4][0].includes(subject.userId));
});
test('revoked/expired session fails before binding actor or writing',async()=>{
 const calls=[];
 const execute=createPrivateReviewExecutor({withTransaction:async work=>work(async(sql,args)=>{
  calls.push(sql);return [];
 })});
 await assert.rejects(execute(subject,command),{code:'28000'});
 assert.equal(calls.length,2);
});
test('malformed principal does not open transaction',async()=>{
 let opened=false;
 const execute=createPrivateReviewExecutor({withTransaction:async()=>{opened=true;}});
 await assert.rejects(execute({...subject,userId:'x;DROP TABLE'},command),{code:'28000'});
 assert.equal(opened,false);
});
test('private command failure propagates for enclosing transaction rollback',async()=>{
 let rollback=false;
 const execute=createPrivateReviewExecutor({withTransaction:async work=>{
  try{return await work(async sql=>{
   if(sql.startsWith('SELECT 1 FROM auth.sessions'))return [1];
   if(sql.startsWith('SELECT review_stage.review_command'))throw Object.assign(new Error('failure'),{code:'40001'});
   return [];
  });}catch(e){rollback=true;throw e;}
 }});
 await assert.rejects(execute(subject,command),{code:'40001'});
 assert.equal(rollback,true);
});
