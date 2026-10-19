// 14G6C: actual HTTP routes + trusted private command + disposable Postgres.
// The fake verifyUser below is ONLY a fixture; no signed Supabase JWT is tested.
import postgres from 'npm:postgres@3.4.7';
import {createReviewHttpServer} from '../../services/review-api/httpServer.mjs';
import {createPrivateReviewExecutor} from '../../supabase/functions/_shared/privateReviewExecutor.mjs';

const assert=(v,msg)=>{if(!v)throw new Error(msg)};
if(!['127.0.0.1','localhost'].includes(Deno.env.get('PGHOST')||'') ||
 Deno.env.get('PGDATABASE')!=='review_test')
 throw new Error('Do not run integration outside disposable PostgreSQL');

const reviewerEng={userId:'11111111-1111-4111-8111-111111111113',sessionId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'};
const reviewerScience={userId:'11111111-1111-4111-8111-111111111114',sessionId:'abababab-abab-4bab-8bab-abababababab'};
const contributor={userId:'11111111-1111-4111-8111-111111111111',sessionId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const outsiders={userId:'11111111-1111-4111-8111-111111111119',sessionId:'ffffffff-ffff-4fff-8fff-ffffffffffff'};
const actors={contributor,engineering:reviewerEng,scientific:reviewerScience,outsider:outsiders};
const db=postgres({host:'127.0.0.1',port:5432,database:'review_test',username:'nfq_review_transport',password:'ci-disposable-only',
 max:1,prepare:false,connect_timeout:5});
const admin=postgres({host:'127.0.0.1',port:5432,database:'review_test',username:'postgres',password:'disposable-test-only',
 max:1,prepare:false,connect_timeout:5});
const executor=createPrivateReviewExecutor({
 withTransaction:work=>db.begin(async tx=>work(async (statement,args)=>Array.from(await tx.unsafe(statement,args))))
});
const server=createReviewHttpServer({
 enabled:false,submissionEnabled:true,reviewerDecisionEnabled:true,
 allowedOrigin:'https://fq.neumact.org',
 verifyUser:async jwt=>actors[jwt.split('.')[1]]??null,
 executeReview:executor
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
const base='http://127.0.0.1:'+server.address().port;
let requests=0;
const send=async(kind,actor,payload)=>{
 requests++;
 const route=kind==='submit'?'/v1/helios/submissions':'/v1/helios/reviews/decisions';
 const response=await fetch(base+route,{method:'POST',headers:{
  origin:'https://fq.neumact.org','content-type':'application/json',
  authorization:'Bearer eyJhbGciOiJIUzI1NiJ9.'+actor+'.signature'},
  body:JSON.stringify(payload)
 });
 return {status:response.status,data:await response.json()};
};
const submission=(id='NFQ-NOM-106')=>({
 decisionId:id,revision:1,expectedVersion:0,action:'submit',
 idempotencyKey:'submit-record-106',rationale:'Curated source snapshot prepared for independent review'
});
const vote=(role,expectedVersion,key)=>({
 decisionId:'NFQ-NOM-106',revision:1,expectedVersion,
 action:'review',vote:'approve',role,idempotencyKey:key,
 rationale:'Independently examined recorded research evidence'
});
try{
 // A contributor submits a pre-existing, source-verified record.
 const sent=await send('submit','contributor',submission());
 assert(sent.status===200&&sent.data.phase==='under-review'&&sent.data.version===1,
   'Valid contributor submission was not committed');
 assert(sent.data.eventId===undefined&&!JSON.stringify(sent.data).includes(contributor.userId),
   'HTTP response disclosed database audit or actor identifiers');

 const replay=await send('submit','contributor',submission());
 assert(replay.status===200&&replay.data.replayed===true,'Lost-response retry was not idempotent');
 const changed=await send('submit','contributor',{...submission(),rationale:'Modified replay evidence rationale'});
 assert(changed.status===409,'Reused key with different payload did not conflict');

 const invalidEvidence=await send('submit','contributor',{
  ...submission('NFQ-NOM-107'),idempotencyKey:'submit-unchecked-107'
 });
 assert(invalidEvidence.status===422,'Missing authority evidence check was accepted');

 const outsider=await send('submit','outsider',submission());
 assert(outsider.status===403,'Nonmember submitted research evidence');
 const selfReview=await send('review','contributor',vote('scientific',1,'self-review-req1'));
 assert(selfReview.status===403,'Contributor performed their own scientific review');
 const actionSwap=await send('submit','contributor',vote('scientific',1,'forged-action001'));
 assert(actionSwap.status===403,'Submission endpoint accepted review action');
 const forgedRelease=await send('review','engineering',{
  decisionId:'NFQ-NOM-106',revision:1,expectedVersion:1,action:'release',
  idempotencyKey:'release-not-allowed',rationale:'Unapproved release requested'
 });
 assert(forgedRelease.status===403,'Reviewer endpoint accepted release operation');

 // Two DIFFERENT authorized reviewers race the same expected version.
 const eng=vote('engineering',1,'review-eng-1060');
 const scientific=vote('scientific',1,'review-sci-1060');
 const concurrent=await Promise.all([
  send('review','engineering',eng),send('review','scientific',scientific)
 ]);
 const outcomes=concurrent.map(x=>x.status).sort().join(',');
 assert(outcomes==='200,409','Concurrent stale-version serialization failed: '+outcomes);
 const winner=concurrent[0].status===200?'engineering':'scientific';
 const loser=winner==='engineering'?'scientific':'engineering';
 const retry=await send('review',loser,loser==='scientific'?
  {...scientific,expectedVersion:2,idempotencyKey:'review-sci-after'}:
  {...eng,expectedVersion:2,idempotencyKey:'review-eng-after'});
 assert(retry.status===200&&retry.data.phase==='ready-for-release'&&retry.data.version===3,
  'Independent second reviewer did not reach ready-for-release');
 assert(retry.data.phase!=='released','Unapproved scientific release occurred');

 // Replays retain the same immutable decision status, never duplicate events.
 const firstReplay=await send('review',winner,winner==='engineering'?eng:scientific);
 assert(firstReplay.status===200&&firstReplay.data.replayed===true,
  'Committed review replay was not idempotent');

 const count=await admin.unsafe(
  "SELECT (SELECT COUNT(*)::int FROM review_stage.events WHERE decision_id='NFQ-NOM-106') AS events, (SELECT COUNT(*)::int FROM review_stage.reviews WHERE decision_id='NFQ-NOM-106') AS reviews, (SELECT COUNT(*)::int FROM review_stage.idempotency WHERE decision_id='NFQ-NOM-106') AS keys, (SELECT phase FROM review_stage.decisions WHERE id='NFQ-NOM-106') AS phase, (SELECT row_version FROM review_stage.decisions WHERE id='NFQ-NOM-106') AS version"
 );
 assert(count[0].events===3&&count[0].reviews===2&&count[0].keys===3&&
  count[0].phase==='ready-for-release'&&count[0].version===3,
  'Audit integrity or controlled workflow diverged');

 // Revocation takes effect on the private database even if bearer stub still
 // thinks the actor is verified. Neither replay nor a new vote may succeed.
 await admin.unsafe(
  'UPDATE public.nfq_research_memberships SET revoked_at=now() WHERE user_id=$1::uuid',
  [reviewerEng.userId]
 );
 const afterRevocation=await send('review','engineering',eng);
 assert(afterRevocation.status===403,'Revoked reviewer replay bypassed membership denial');

 await admin.unsafe('DELETE FROM auth.sessions WHERE id=$1::uuid',[reviewerScience.sessionId]);
 const afterSession=await send('review','scientific',scientific);
 assert(afterSession.status===403,'Revoked reviewer session still authorized');

 const final=await admin.unsafe(
  "SELECT COUNT(*)::int AS n FROM review_stage.events WHERE decision_id='NFQ-NOM-106'"
 );
 assert(final[0].n===3,'Rejected/revoked requests modified immutable scientific audit');
 console.log('PASS 14G6C: '+requests+' HTTP write-contract requests, two independent reviews, one stale-version rejection; release disabled; immutable audit');
}finally{
 await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
 await db.end({timeout:2});await admin.end({timeout:2});
}
