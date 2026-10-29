/**
 * 14G3: portable, server-only request boundary. NEVER import this module into
 * the Vue bundle. Disabled by default; no database connector is configured
 * here. Caller JWTs and identities are verified via the *trusted* Auth API.
 */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decision=/^NFQ-(?:NOM|GATE)-[0-9]{3}$/;
const key=/^[a-zA-Z0-9_-]{12,128}$/;
const roles=new Set(['scientific','privacy','engineering']);
const fields=new Set(['decisionId','revision','expectedVersion','action','vote','role','idempotencyKey','rationale']);

const result=(status,code,origin)=>new Response(JSON.stringify({error:code}),{
 status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',
   'x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})}
});
function good(payload,origin){
 if(!payload||typeof payload!=='object')return result(503,'unavailable',origin);
 const id=payload.decisionId,rev=payload.revision,version=payload.version,phase=payload.phase;
 if(typeof id!=='string'||!decision.test(id)||!Number.isSafeInteger(rev)||
   !Number.isSafeInteger(version)||!['draft','under-review','ready-for-release','rejected','released'].includes(phase))
   return result(503,'unavailable',origin);
 return new Response(JSON.stringify({decisionId:id,revision:rev,version,phase,
   replayed:payload.replayed===true}),{status:200,headers:{
   'content-type':'application/json; charset=utf-8','cache-control':'no-store',
   'x-content-type-options':'nosniff','access-control-allow-origin':origin,'vary':'Origin'
 }});
}
export function decodeReviewCommand(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const x=input;
 if(Object.keys(x).some(name=>!fields.has(name)))return null;
 if(typeof x.decisionId!=='string'||!decision.test(x.decisionId)||
    !Number.isInteger(x.revision)||x.revision<1||
    !Number.isInteger(x.expectedVersion)||x.expectedVersion<0||
    !key.test(x.idempotencyKey||'')||typeof x.rationale!=='string'||
    x.rationale.trim().length<12||x.rationale.length>2000||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(x.rationale))
   return null;
 if(x.action==='submit'||x.action==='release'){
  if(x.role!==undefined||x.vote!==undefined)return null;
 }else if(x.action==='review'){
  if(!roles.has(x.role)||!['approve','reject'].includes(x.vote))return null;
 }else return null;
 return Object.freeze({
  decisionId:x.decisionId,revision:x.revision,expectedVersion:x.expectedVersion,
  action:x.action,role:x.action==='review'?x.role:null,vote:x.action==='review'?x.vote:null,
  idempotencyKey:x.idempotencyKey,rationale:x.rationale.trim()
 });
}
async function boundedJSON(request,maxBytes=4096){
 const stated=Number(request.headers.get('content-length')||0);
 if(stated>maxBytes)throw new Error('oversize');
 if(!request.body)throw new Error('empty');
 const reader=request.body.getReader(),chunks=[];let count=0;
 try{
  while(true){
   const {done,value}=await reader.read();if(done)break;
   count+=value.byteLength;if(count>maxBytes)throw new Error('oversize');chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const bytes=new Uint8Array(count);let at=0;
 for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}
 return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
/** No cookies or client-supplied actor/role ever determine authorization. */
export function createReviewGateway({verifyUser,execute,enabled=false,allowedOrigin,allowRelease=false,allowedAction=null}){
 return async function handle(request){
  const origin=request.headers.get('origin');
  if(!allowedOrigin||!/^https:\/\/[^/]+$/.test(allowedOrigin))
   return result(503,'unavailable');
  if(origin!==allowedOrigin)return result(403,'origin_denied');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'access-control-allow-origin':allowedOrigin,'access-control-allow-methods':'POST, OPTIONS',
   'access-control-allow-headers':'authorization, content-type','vary':'Origin'
  }});
  if(request.method!=='POST')return result(405,'method_denied',allowedOrigin);
  if(!enabled)return result(503,'not_connected',allowedOrigin);
  const type=request.headers.get('content-type')||'';
  if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(type))
   return result(415,'invalid_content_type',allowedOrigin);
  const bearer=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
   request.headers.get('authorization')||'');
  if(!bearer)return result(401,'authentication_required',allowedOrigin);
  let command;
  try{command=decodeReviewCommand(await boundedJSON(request));}
  catch{return result(400,'invalid_request',allowedOrigin);}
  if(!command)return result(400,'invalid_command',allowedOrigin);
  // A public route permits exactly one command class; browser cannot select
  // reviewer authority or re-route a submission by changing JSON action.
  if(allowedAction!==null&&command.action!==allowedAction)
   return result(403,'action_not_permitted',allowedOrigin);
  if(command.action==='release'&&!allowRelease)
   return result(403,'release_not_enabled',allowedOrigin);
  let principal;
  try{principal=await verifyUser(bearer[1]);}
  catch{return result(503,'identity_service_unavailable',allowedOrigin);}
  if(!principal||!uuid.test(principal.userId)||!uuid.test(principal.sessionId))
   return result(401,'authentication_required',allowedOrigin);
  try{
   const outcome=await execute({userId:principal.userId,sessionId:principal.sessionId},command);
   return good(outcome,allowedOrigin);
  }catch(err){
   // Do not expose SQL, connection addresses, data, JWTs or reviewer identity.
   const code=err&&typeof err==='object'?err.code:null;
   if(code==='42501'||code==='28000')return result(403,'not_authorized',allowedOrigin);
   if(code==='40001'||code==='P0001'||code==='23505')
    return result(409,'review_conflict',allowedOrigin);
   if(code==='23514')return result(422,'evidence_not_verified',allowedOrigin);
   return result(503,'review_unavailable',allowedOrigin);
  }
 };
}

/**
 * Bound the trusted Auth API response before parsing. A 200 response is still
 * untrusted network input until its body has passed this limit and is parsed.
 * No raw profile data or transport errors are included in client responses.
 */
async function readBoundedAuthUser(response,maxBytes=65536){
 const stated=response.headers.get('content-length');
 if(stated!==null&&(!/^[0-9]+$/.test(stated)||Number(stated)>maxBytes))
  throw new Error('Auth unavailable');
 if(!response.body)throw new Error('Auth unavailable');
 const reader=response.body.getReader(),parts=[];
 let size=0,done=false;
 try{
  while(true){
   const next=await reader.read();
   if(next.done){done=true;break;}
   if(!(next.value instanceof Uint8Array))throw new Error('Auth unavailable');
   size+=next.value.byteLength;
   if(size>maxBytes)throw new Error('Auth unavailable');
   parts.push(next.value);
  }
 }catch{
  try{await reader.cancel();}catch{/* Transport is already unavailable. */}
  throw new Error('Auth unavailable');
 }finally{
  if(!done)try{await reader.cancel();}catch{/* no-op */}
  reader.releaseLock();
 }
 const bytes=new Uint8Array(size);let offset=0;
 for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}
 catch{throw new Error('Auth unavailable');}
}

/** Verify token with the project's Auth API. Never trust decoded JWT alone. */
export function createSupabaseVerifier({authOrigin,publishableKey,transport=fetch,authTimeoutMs=5000}){
 let origin;
 try{origin=new URL(authOrigin);}
 catch{throw new Error('Invalid Auth URL');}
 if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||
    origin.hash||origin.username||origin.password||!origin.hostname.endsWith('.supabase.co')||
    !publishableKey?.trim())throw new Error('Invalid server-side Auth configuration');
 if(!Number.isSafeInteger(authTimeoutMs)||authTimeoutMs<10||authTimeoutMs>10000)
  throw new Error('Invalid Auth timeout configuration');
 return async token=>{
  // Cheap structural guard before contacting the remote Auth service.
  // Cryptographic authority still belongs ONLY to the trusted Auth API.
  if(typeof token!=='string'||token.length>4096||
     !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
   return null;
  const response=await transport(origin.origin+'/auth/v1/user',{
   method:'GET',headers:{Authorization:'Bearer '+token,apikey:publishableKey,
     Accept:'application/json'},credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(authTimeoutMs)
  });
  if(response.status===401||response.status===403)return null;
  if(!response.ok)throw new Error('Auth unavailable');
  const user=await readBoundedAuthUser(response);
  if(!user||!uuid.test(user.id)||user.is_anonymous===true||
     !user.email_confirmed_at)return null;
  // The Auth API has verified this *same* token. Requiring matching subject
  // and session_id here prevents the bridge from accepting an arbitrary actor.
  let claims;
  try{
   const encoded=token.split('.')[1];
   claims=JSON.parse(atob(encoded.replace(/-/g,'+').replace(/_/g,'/')));
  }catch{return null;}
  if(claims.sub!==user.id||claims.role!=='authenticated'||!uuid.test(claims.session_id)||
     claims.iss!==origin.origin+'/auth/v1'||typeof claims.exp!=='number'||
     claims.exp*1000<=Date.now())return null;
  return Object.freeze({userId:user.id,sessionId:claims.session_id});
 };
}
