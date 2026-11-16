import {
 validateReadOnlyConfig,
 type ReadOnlyConfig,type ReadSessionProvider
} from '../services/liveVariants';
import {canonicalGeographyVariantId} from './variantGeographyContext';

/** Explicitly historical *search* events, not genotype frequency, prevalence or patient locations. */
export interface RegionalResearchActivity {
 readonly regionCode:string;
 readonly searchEvents:number;
 readonly distinctSessions:number;
 readonly firstObservedAt:string;
 readonly lastObservedAt:string;
}

const allowedRegionCodes=new Set(Array.from({length:19},(_,i)=>String(i+1).padStart(2,'0')));
const minimumEvents=20,minimumSessions=10;
export function decodeRegionalResearchActivity(payload:unknown):readonly RegionalResearchActivity[]{
 if(!Array.isArray(payload)||payload.length>19)throw new Error('Unexpected geographic activity response');
 const codes=new Set<string>(),rows:RegionalResearchActivity[]=[];
 for(const raw of payload){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid aggregate row');
  const obj=raw as Record<string,unknown>;
  const code=obj.region_code,events=obj.search_events,sessions=obj.distinct_sessions;
  const first=obj.first_observed_at,last=obj.last_observed_at;
  if(typeof code!=='string'||!allowedRegionCodes.has(code)||codes.has(code)||
     !Number.isSafeInteger(events)||typeof events!=='number'||events<minimumEvents||
     !Number.isSafeInteger(sessions)||typeof sessions!=='number'||
     sessions<minimumSessions||sessions>events||
     typeof first!=='string'||typeof last!=='string'||!Number.isFinite(Date.parse(first))||
     !Number.isFinite(Date.parse(last))||Date.parse(last)<Date.parse(first))
   throw new Error('Unverifiable geographic search aggregate');
  codes.add(code);
  rows.push({regionCode:code,searchEvents:events,distinctSessions:sessions,
   firstObservedAt:first,lastObservedAt:last});
 }
 return rows.sort((a,b)=>b.searchEvents-a.searchEvents);
}

export type RegionalActivityResult=
 |{status:'available';rows:readonly RegionalResearchActivity[]}
 |{status:'empty';rows:readonly []}
 |{status:'restricted'|'unavailable';rows:readonly []};

/**
 * The RPC is SECURITY DEFINER, but server code checks live membership and
 * suppresses cells below 20 hits/10 distinct sessions. Frontend checks are UX
 * only; no direct REST SELECT of raw search_logs is ever attempted.
 */
export async function getRegionalResearchActivity(
 config:ReadOnlyConfig,session:ReadSessionProvider,
 variantId:string|null,transport:typeof fetch=fetch,signal?:AbortSignal
):Promise<RegionalActivityResult>{
 if(variantId!==null&&canonicalGeographyVariantId(variantId)!==variantId)
  return {status:'unavailable',rows:[]};
 let root:URL;
 try{root=validateReadOnlyConfig(config);}
 catch{return {status:'unavailable',rows:[]};}
 const token=await session.getAccessToken();
 if(!token)return {status:'restricted',rows:[]};
 const endpoint=new URL('/rest/v1/rpc/nfq_geographic_research_activity',root);
 let response:Response;
 try{
  response=await transport(endpoint.toString(),{
   method:'POST',
   headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
    'Content-Type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_variant_id:variantId}),
   credentials:'omit',cache:'no-store',redirect:'error',signal
  });
 }catch(error){
  if(signal?.aborted)throw error;
  return {status:'unavailable',rows:[]};
 }
 if(response.status===401||response.status===403)return {status:'restricted',rows:[]};
 if(!response.ok)return {status:'unavailable',rows:[]};
 try{
  const rows=decodeRegionalResearchActivity(await response.json());
  return rows.length?{status:'available',rows}:{status:'empty',rows:[]};
 }catch{return {status:'unavailable',rows:[]};}
}
