// Phase 14G4B: read-only Helios queue candidate; NOT deployed.
// Never enable on production until real staging Auth, grants and HTTP tests pass.
import postgres from 'npm:postgres@3.4.7';
import {createSupabaseVerifier} from '../_shared/reviewGateway.mjs';
import {createPrivateReviewQueueReader} from '../_shared/privateReviewQueueReader.mjs';
import {createReviewQueueGateway} from '../_shared/reviewQueueGateway.mjs';

const enabled=Deno.env.get('NFQ_REVIEW_QUEUE_ENABLED')==='true';
const origin=Deno.env.get('SUPABASE_URL')||'';
const pubKey=Deno.env.get('SUPABASE_ANON_KEY')||'';
const privateUrl=Deno.env.get('NFQ_REVIEW_DB_URL')||'';
let verifyUser:(jwt:string)=>Promise<{userId:string;sessionId:string}|null>=async()=>null;
let readQueue:(actor:any,offset:number)=>Promise<any>=async()=>{throw new Error('Disconnected');};
let ready=false;
if(enabled&&origin&&pubKey&&privateUrl){
 try{
  const connection=new URL(privateUrl);
  if(!['postgres:','postgresql:'].includes(connection.protocol)||
     connection.username!=='nfq_review_transport'||!connection.password||
     !connection.hostname.endsWith('.supabase.com'))throw new Error('Missing narrow review credentials');
  verifyUser=createSupabaseVerifier({authOrigin:origin,publishableKey:pubKey});
  const sql=postgres(privateUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:10});
  readQueue=createPrivateReviewQueueReader({withTransaction:
   (work:(query:(statement:string,values:(string|number|null)[])=>Promise<unknown[]>)=>Promise<unknown>)=>
    sql.begin(async tx=>work(async(statement,values)=>Array.from(await tx.unsafe(statement,values))))
  });
  ready=true;
 }catch{ready=false;}
}
const handle=createReviewQueueGateway({
 enabled:ready,allowedOrigin:'https://fq.neumact.org',verifyUser,readQueue
});
Deno.serve(request=>handle(request));
