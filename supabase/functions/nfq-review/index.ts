// Phase 14G3 candidate Supabase Edge Function.
// NOT deployed. Default OFF. Requires a separately provisioned,
// least-privilege, non-Postgres-owner transport login before activation.
import postgres from 'npm:postgres@3.4.7';
import {createReviewGateway,createSupabaseVerifier} from '../_shared/reviewGateway.mjs';
import {createPrivateReviewExecutor} from '../_shared/privateReviewExecutor.mjs';

const enabled=Deno.env.get('NFQ_REVIEW_GATEWAY_ENABLED')==='true';
const publicUrl=Deno.env.get('SUPABASE_URL')||'';
const publicKey=Deno.env.get('SUPABASE_ANON_KEY')||'';
const dbUrl=Deno.env.get('NFQ_REVIEW_DB_URL')||'';
const allowedOrigin='https://fq.neumact.org';
let verifyUser:(token:string)=>Promise<{userId:string;sessionId:string}|null>=async()=>null;
let execute:(principal:any,command:any)=>Promise<any>=async()=>{
 throw new Error('Review backend not connected');
};
let ready=false;
if(enabled && publicUrl && publicKey && dbUrl){
 try{
  const credentials=new URL(dbUrl);
  // Never allow built-in broad database owner/service credentials here.
  if(!['postgres:','postgresql:'].includes(credentials.protocol)||
     credentials.username!=='nfq_review_transport'||
     !credentials.password||!credentials.hostname.endsWith('.supabase.com'))
    throw new Error('Dedicated database transport identity not provisioned');
  verifyUser=createSupabaseVerifier({authOrigin:publicUrl,publishableKey:publicKey});
  const sql=postgres(dbUrl,{max:1,prepare:false,connect_timeout:5,idle_timeout:10});
  execute=createPrivateReviewExecutor({
   withTransaction:(work:(query:(text:string,values:(string|number|null)[])=>Promise<unknown[]>)=>Promise<unknown>)=>sql.begin(async tx=>{
    // postgres.js uses parameterized .unsafe(text, values) within this
    // explicit transaction. No browser-supplied SQL names are interpolated.
    return work(async(text,values)=>Array.from(await tx.unsafe(text,values)));
   })
  });
  ready=true;
 }catch{
  ready=false;
 }
}
const handle=createReviewGateway({verifyUser,execute,enabled:ready,allowedOrigin,allowRelease:false});
Deno.serve(request=>handle(request));
