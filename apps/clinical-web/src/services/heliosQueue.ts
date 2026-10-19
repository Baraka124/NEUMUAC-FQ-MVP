import {readConfigFromEnvironment,validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {ReadSessionProvider} from './liveVariants';

export interface HeliosQueueItem{
 readonly decisionId:string;
 readonly kind:'alias-equivalence'|'search-disposition';
 readonly phase:'under-review'|'ready-for-release';
 readonly revision:number;
 readonly version:number;
 readonly createdAt:string;
}
export interface HeliosQueuePage{
 readonly items:readonly HeliosQueueItem[];
 readonly offset:number;
 readonly hasMore:boolean;
}
export class HeliosQueueError extends Error{
 constructor(public readonly kind:'sign-in-required'|'access-denied'|'unavailable',message:string){
  super(message);this.name='HeliosQueueError';
 }
}
const decision=/^NFQ-(?:NOM|GATE)-[0-9]{3}$/;
export function decodeHeliosQueuePage(value:unknown,expectedOffset:number):HeliosQueuePage{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new HeliosQueueError('unavailable','Invalid queue response');
 const v=value as Record<string,unknown>;
 if(!Array.isArray(v.items)||v.items.length>20||v.offset!==expectedOffset||
    typeof v.hasMore!=='boolean'||(v.hasMore&&v.items.length!==20))
  throw new HeliosQueueError('unavailable','Invalid queue pagination');
 const seen=new Set<string>();
 const items:HeliosQueueItem[]=v.items.map((item:unknown)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))
   throw new HeliosQueueError('unavailable','Invalid queue record');
  const x=item as Record<string,unknown>;
  if(typeof x.decisionId!=='string'||!decision.test(x.decisionId)||seen.has(x.decisionId)||
     (x.kind!=='alias-equivalence'&&x.kind!=='search-disposition')||
     (x.phase!=='under-review'&&x.phase!=='ready-for-release')||
     !Number.isSafeInteger(x.revision)||(x.revision as number)<1||
     !Number.isSafeInteger(x.version)||(x.version as number)<0||
     typeof x.createdAt!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x.createdAt)||
     !Number.isFinite(Date.parse(x.createdAt)))
    throw new HeliosQueueError('unavailable','Invalid queue metadata');
  seen.add(x.decisionId);
  return {decisionId:x.decisionId,kind:x.kind,phase:x.phase,revision:x.revision,
   version:x.version,createdAt:x.createdAt} as HeliosQueueItem;
 });
 return {items,offset:expectedOffset,hasMore:v.hasMore};
}
/**
 * The public catalog may remain on Supabase while an independently hosted,
 * authenticated API (such as Railway) serves Helios.
 * This is a build-time, non-secret endpoint setting, NOT a review permission.
 * Never accept endpoint URLs from a search field or a server response.
 */
export function resolveHeliosQueueEndpoint(catalogOrigin:string,configuredApiOrigin?:string|null){
 if(!configuredApiOrigin)return {url:catalogOrigin+'/functions/v1/nfq-review-queue',supabaseFunction:true} as const;
 let parsed:URL;
 try{parsed=new URL(configuredApiOrigin);}
 catch{throw new HeliosQueueError('unavailable','Invalid configured review API origin');}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.port||
    parsed.search||parsed.hash||parsed.pathname!=='/'||
    !parsed.hostname||parsed.hostname==='localhost'||
    /^(?:\d+\.){3}\d+$/.test(parsed.hostname))
   throw new HeliosQueueError('unavailable','Invalid configured review API origin');
 return {url:parsed.origin+'/v1/helios/reviews',supabaseFunction:false} as const;
}
export function createHeliosQueueSource(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch,
 apiOrigin?:string|null
){
 const base=validateReadOnlyConfig(config);
 const endpoint=resolveHeliosQueueEndpoint(base.origin,apiOrigin);
 const url=endpoint.url;
 return {
  async list(offset=0,signal?:AbortSignal):Promise<HeliosQueuePage>{
   if(!Number.isSafeInteger(offset)||offset<0||offset>1000||offset%20!==0)
    throw new HeliosQueueError('unavailable','Unsupported queue page');
   // Abort may arrive while Supabase refreshes/restores a token. Never
   // initiate a queue fetch with credentials from a cancelled session.
   if(signal?.aborted)throw new HeliosQueueError('unavailable','Queue request interrupted');
   const token=await session.getAccessToken();
   if(signal?.aborted)throw new HeliosQueueError('unavailable','Queue request interrupted');
   if(!token)throw new HeliosQueueError('sign-in-required','Sign in to view authorized reviews');
   let response:Response;
   try{response=await transport(url+'?offset='+offset,{method:'GET',
    credentials:'omit',cache:'no-store',redirect:'error',signal,
    headers:{Authorization:'Bearer '+token,Accept:'application/json',
     ...(endpoint.supabaseFunction?{apikey:config.publishableKey}:{})}});}
   catch(e){if(signal?.aborted)throw e;throw new HeliosQueueError('unavailable','Queue service unavailable');}
   if(response.status===401)throw new HeliosQueueError('sign-in-required','Session expired');
   if(response.status===403)throw new HeliosQueueError('access-denied','Review access not permitted');
   if(!response.ok)throw new HeliosQueueError('unavailable','Queue service unavailable');
   let raw:unknown;
   try{raw=await response.json();}
   catch{throw new HeliosQueueError('unavailable','Invalid queue response');}
   if(signal?.aborted)throw new HeliosQueueError('unavailable','Queue request interrupted');
   return decodeHeliosQueuePage(raw,offset);
  }
 };
}
export function configuredHeliosQueueSource(session:ReadSessionProvider|null|undefined){
 // This is only a non-secret UI switch; server authorization is independent.
 if(import.meta.env.VITE_NFQ_HELIOS_QUEUE_ENABLED!=='true'||!session)return null;
 const cfg=readConfigFromEnvironment();
 if(!cfg)return null;
 try{return createHeliosQueueSource(cfg,session,fetch,import.meta.env.VITE_NFQ_REVIEW_API_ORIGIN);}
 catch{return null;}
}
