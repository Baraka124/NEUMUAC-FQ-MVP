/** Read-only, Auth-verified and strictly redacted Helios reviewer queue. */
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const decision=/^NFQ-(?:NOM|GATE)-[0-9]{3}$/;
const allowedKinds=new Set(['alias-equivalence','search-disposition']);
const allowedPhases=new Set(['under-review','ready-for-release']);
const headers=origin=>({
 'content-type':'application/json; charset=utf-8','cache-control':'no-store',
 'x-content-type-options':'nosniff',...(origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{})
});
const error=(status,code,origin)=>new Response(JSON.stringify({error:code}),{status,headers:headers(origin)});
export function decodeReviewQueuePage(value,expectedOffset){
 if(!value||typeof value!=='object'||Array.isArray(value)||
    !Array.isArray(value.items)||value.items.length>20||
    typeof value.hasMore!=='boolean'||value.offset!==expectedOffset)return null;
 const ids=new Set(),items=[];
 for(const entry of value.items){
  if(!entry||typeof entry!=='object'||Array.isArray(entry))return null;
  const {decisionId,kind,phase,revision,version,createdAt}=entry;
  if(typeof decisionId!=='string'||!decision.test(decisionId)||ids.has(decisionId)||
     !allowedKinds.has(kind)||!allowedPhases.has(phase)||
     !Number.isInteger(revision)||revision<1||
     !Number.isInteger(version)||version<0||
     typeof createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(createdAt)||
     !Number.isFinite(Date.parse(createdAt)))return null;
  ids.add(decisionId);
  items.push({decisionId,kind,phase,revision,version,createdAt});
 }
 if(value.hasMore&&items.length!==20)return null;
 return {items,hasMore:value.hasMore,offset:expectedOffset};
}
export function createReviewQueueGateway({verifyUser,readQueue,enabled=false,allowedOrigin}){
 return async request=>{
  const origin=request.headers.get('origin');
  if(!allowedOrigin||!/^https:\/\/[^/]+$/.test(allowedOrigin))
   return error(503,'not_configured');
  if(origin!==allowedOrigin)return error(403,'origin_denied');
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
   'access-control-allow-origin':allowedOrigin,'access-control-allow-methods':'GET, OPTIONS',
   'access-control-allow-headers':'authorization, apikey','vary':'Origin','cache-control':'no-store'
  }});
  if(request.method!=='GET')return error(405,'read_only',allowedOrigin);
  if(!enabled)return error(503,'not_connected',allowedOrigin);
  const url=new URL(request.url);
  if([...url.searchParams.keys()].some(x=>x!=='offset')||url.searchParams.getAll('offset').length>1)
   return error(400,'invalid_page',allowedOrigin);
  const supplied=url.searchParams.get('offset')??'0';
  if(!/^(?:0|[1-9]\d{0,3})$/.test(supplied))return error(400,'invalid_page',allowedOrigin);
  const offset=Number(supplied);
  if(offset>1000||offset%20!==0)return error(400,'invalid_page',allowedOrigin);
  const bearer=/^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/.exec(
   request.headers.get('authorization')||'');
  if(!bearer)return error(401,'authentication_required',allowedOrigin);
  let principal;
  try{principal=await verifyUser(bearer[1]);}
  catch{return error(503,'identity_unavailable',allowedOrigin);}
  if(!principal||!uuid.test(principal.userId)||!uuid.test(principal.sessionId))
   return error(401,'authentication_required',allowedOrigin);
  try{
   const raw=await readQueue({userId:principal.userId,sessionId:principal.sessionId},offset);
   const safe=decodeReviewQueuePage(raw,offset);
   if(!safe)return error(503,'queue_unavailable',allowedOrigin);
   return new Response(JSON.stringify(safe),{status:200,headers:headers(allowedOrigin)});
  }catch(e){
   const code=e&&typeof e==='object'?e.code:null;
   if(code==='42501'||code==='28000')return error(403,'access_denied',allowedOrigin);
   if(code==='22023')return error(400,'invalid_page',allowedOrigin);
   return error(503,'queue_unavailable',allowedOrigin);
  }
 };
}
