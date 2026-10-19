/**
 * Hosting-neutral HTTP adapter for the existing authorized Helios queue.
 * Runs on Node 22+ (for example, a future Railway service), but is never
 * deployed by this repository. Callers MUST supply real, trusted auth and
 * private PostgreSQL adapters. The default is deliberately disconnected.
 */
import {createServer} from 'node:http';
import {createReviewQueueGateway} from '../../supabase/functions/_shared/reviewQueueGateway.mjs';
import {createReviewGateway} from '../../supabase/functions/_shared/reviewGateway.mjs';

const plain=(status,body)=>({status,headers:{'cache-control':'no-store',
 'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'},body});

export function createReviewHttpServer({
 verifyUser=async()=>null,
 readQueue=async()=>{throw new Error('Review service disconnected');},
 executeReview=async()=>{throw new Error('Review writes disconnected');},
 enabled=false,
 submissionEnabled=false,
 reviewerDecisionEnabled=false,
 allowedOrigin='https://fq.neumact.org'
}={}){
 const handle=createReviewQueueGateway({verifyUser,readQueue,enabled,allowedOrigin});
 const handleSubmit=createReviewGateway({verifyUser,execute:executeReview,
   enabled:submissionEnabled,allowedOrigin,allowedAction:'submit',allowRelease:false});
 const handleReview=createReviewGateway({verifyUser,execute:executeReview,
   enabled:reviewerDecisionEnabled,allowedOrigin,allowedAction:'review',allowRelease:false});
 return createServer(async(req,res)=>{
  // Exact route contract; never proxy arbitrary URLs or leak request headers.
  let path;
  try{path=new URL(req.url||'/', 'http://127.0.0.1');}
  catch{const reply=plain(400,JSON.stringify({error:'invalid_request'}));res.writeHead(reply.status,reply.headers);res.end(reply.body);return;}
  if(path.pathname==='/healthz'&&req.method==='GET'){
   const reply=plain(200,JSON.stringify({status:'ok'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  const queue=path.pathname==='/v1/helios/reviews';
  const submission=path.pathname==='/v1/helios/submissions';
  const review=path.pathname==='/v1/helios/reviews/decisions';
  if(!queue&&!submission&&!review){
   const reply=plain(404,JSON.stringify({error:'not_found'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  const allowed=queue?['GET','OPTIONS']:['POST','OPTIONS'];
  if(!allowed.includes(req.method)){
   const reply=plain(405,JSON.stringify({error:queue?'read_only':'method_denied'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  if((submission||review)&&path.search){
   const reply=plain(400,JSON.stringify({error:'invalid_request'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  let response;
  try{
   const headers=new Headers();
   if(typeof req.headers.origin==='string')headers.set('origin',req.headers.origin);
   if(typeof req.headers.authorization==='string')headers.set('authorization',req.headers.authorization);
   if(typeof req.headers['content-type']==='string')headers.set('content-type',req.headers['content-type']);
   if((submission||review)&&req.method==='POST'){
    // Hard cap enforced before constructing a Web Request. The downstream
    // handler independently parses and validates the small JSON command.
    const chunks=[];let n=0;let oversize=false;
    for await(const chunk of req){
     n+=chunk.length;
     if(n>4096){oversize=true;break;}
     chunks.push(chunk);
    }
    if(oversize){
     req.resume();const reply=plain(413,JSON.stringify({error:'request_too_large'}));
     res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
    }
    response=await (submission?handleSubmit:handleReview)(
     new Request('http://127.0.0.1'+path.pathname,{
      method:'POST',headers,body:Buffer.concat(chunks)
     })
    );
   }else response=await (queue?handle:submission?handleSubmit:handleReview)(new Request(
    'http://127.0.0.1'+path.pathname+path.search,{method:req.method,headers}
   ));
  }catch{
   const reply=plain(503,JSON.stringify({error:'unavailable'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(response.status===204?'':await response.text());
 });
}
