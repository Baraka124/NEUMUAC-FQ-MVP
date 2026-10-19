/**
 * Hosting-neutral HTTP adapter for the existing authorized Helios queue.
 * Runs on Node 22+ (for example, a future Railway service), but is never
 * deployed by this repository. Callers MUST supply real, trusted auth and
 * private PostgreSQL adapters. The default is deliberately disconnected.
 */
import {createServer} from 'node:http';
import {createReviewQueueGateway} from '../../supabase/functions/_shared/reviewQueueGateway.mjs';

const plain=(status,body)=>({status,headers:{'cache-control':'no-store',
 'content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'},body});

export function createReviewHttpServer({
 verifyUser=async()=>null,
 readQueue=async()=>{throw new Error('Review service disconnected');},
 enabled=false,
 allowedOrigin='https://fq.neumact.org'
}={}){
 const handle=createReviewQueueGateway({verifyUser,readQueue,enabled,allowedOrigin});
 return createServer(async(req,res)=>{
  // Exact route contract; never proxy arbitrary URLs or leak request headers.
  let path;
  try{path=new URL(req.url||'/', 'http://127.0.0.1');}
  catch{const reply=plain(400,JSON.stringify({error:'invalid_request'}));res.writeHead(reply.status,reply.headers);res.end(reply.body);return;}
  if(path.pathname==='/healthz'&&req.method==='GET'){
   const reply=plain(200,JSON.stringify({status:'ok'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  if(path.pathname!=='/v1/helios/reviews'){
   const reply=plain(404,JSON.stringify({error:'not_found'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  // For sensitive research APIs, do not accept request bodies or cookie-based
  // identity. The token must be verified by the trusted handler.
  if(req.method!=='GET'&&req.method!=='OPTIONS'){
   const reply=plain(405,JSON.stringify({error:'read_only'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  let response;
  try{
   const headers=new Headers();
   if(typeof req.headers.origin==='string')headers.set('origin',req.headers.origin);
   if(typeof req.headers.authorization==='string')headers.set('authorization',req.headers.authorization);
   response=await handle(new Request('http://127.0.0.1'+path.pathname+path.search,{
    method:req.method,headers
   }));
  }catch{
   const reply=plain(503,JSON.stringify({error:'unavailable'}));
   res.writeHead(reply.status,reply.headers);res.end(reply.body);return;
  }
  res.writeHead(response.status,Object.fromEntries(response.headers));
  res.end(response.status===204?'':await response.text());
 });
}
