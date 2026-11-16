import {validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';
import {decodeConflictEvent,decodeValidationEvent,type ResearchHistory} from './liveResearchHistory';
import type {ArchivedTherapyEvidence} from '../domain/multiTherapyResearch';
import type {RecordedResponse} from '../domain/therapyRegistry';

export interface ResearchSourceSnapshot{
 readonly variantId:string;
 readonly archivedEvidence:readonly ArchivedTherapyEvidence[];
 readonly history:ResearchHistory;
 readonly claimState:'not-provided';
}
const idPattern=/^[1-9]\d{0,17}$/;
function object(value:unknown):Record<string,unknown>{
 if(value===null||typeof value!=='object'||Array.isArray(value))
  throw new VariantConnectionError('schema-mismatch','Invalid research source document');
 return value as Record<string,unknown>;
}
function response(value:unknown):RecordedResponse{
 if(value===null||value==='responsive'||value==='non_responsive'||value==='unknown')
  return value as RecordedResponse;
 throw new VariantConnectionError('schema-mismatch','Invalid archived response code');
}
function sourceRows(data:Record<string,unknown>,field:string):readonly unknown[]{
 const value=data[field];
 if(!Array.isArray(value)||value.length>200)
  throw new VariantConnectionError('schema-mismatch','Incomplete '+field+' source inventory');
 return value;
}
/** This is an archive provenance adapter, NOT a verified-response source. */
export function decodeResearchSourceSnapshot(input:unknown,variantId:string):ResearchSourceSnapshot{
 if(!idPattern.test(variantId))throw new VariantConnectionError('invalid-configuration','Invalid variant identity');
 const data=object(input);
 if(data.variant_id!==variantId||data.kind!=='historical-records-only'||
  data.reviewed_source_claims!=='not-provided')
  throw new VariantConnectionError('schema-mismatch','Research source identity or scope mismatch');
 const seen=new Set<number>();
 const archival=sourceRows(data,'archival').map(raw=>{
  const row=object(raw);
  if(typeof row.id!=='number'||!Number.isSafeInteger(row.id)||row.id<=0||seen.has(row.id)||
   row.variant_id!==variantId||row.source_id!==null&&(
     typeof row.source_id!=='number'||!Number.isSafeInteger(row.source_id)||row.source_id<=0)||
   row.confidence!==null&&typeof row.confidence!=='string'||
   row.created_at!==null&&typeof row.created_at!=='string')
    throw new VariantConnectionError('schema-mismatch','Invalid archived source row');
  seen.add(row.id);
  return Object.freeze({
   id:row.id,variantId,
   sourceId:row.source_id as number|null,
   etiResponse:response(row.eti_response),
   alyftrekResponse:response(row.alyftrek_response),
   recordedConfidence:row.confidence as string|null,
   recordedAt:row.created_at as string|null
  });
 });
 const history:ResearchHistory=Object.freeze({
  conflicts:Object.freeze(sourceRows(data,'conflicts').map(decodeConflictEvent)),
  validations:Object.freeze(sourceRows(data,'validations').map(decodeValidationEvent))
 });
 if(history.conflicts.some(x=>x.variantId!==variantId)||
  history.validations.some(x=>x.variantId!==variantId))
  throw new VariantConnectionError('schema-mismatch','Cross-variant history record');
 return Object.freeze({
  variantId,archivedEvidence:Object.freeze(archival),history,claimState:'not-provided' as const
 });
}
/** Uses the user's auth token; SQL independently checks active research
 * membership before responding. No service_role, no direct table access.
 */
export function createResearchSourceSnapshotReader(
 config:ReadOnlyConfig,
 session:ReadSessionProvider,
 transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 return Object.freeze({
  async get(variantId:string,signal?:AbortSignal):Promise<ResearchSourceSnapshot>{
   if(!idPattern.test(variantId))
    throw new VariantConnectionError('invalid-configuration','Invalid variant identifier');
   const token=await session.getAccessToken();
   if(!token||token===config.publishableKey||
     !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw new VariantConnectionError('authentication-required','Verified researcher session required');
   const url=new URL('/rest/v1/rpc/nfq_research_therapy_source_snapshot',root);
   let result:Response;
   try{
    result=await transport(url.toString(),{
     method:'POST',
     headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      'content-type':'application/json',Accept:'application/json'},
     body:JSON.stringify({p_variant_id:variantId}),
     credentials:'omit',cache:'no-store',redirect:'error',signal
    });
   }catch(error){
    if(signal?.aborted)throw error;
    throw new VariantConnectionError('request-failed','Research source was not available');
   }
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Research source request cancelled');
   if(result.status===401||result.status===403)
    throw new VariantConnectionError('access-denied','Verified research membership required');
   if(!result.ok)
    throw new VariantConnectionError('request-failed','Research source could not be verified');
   let data:unknown;
   try{data=await result.json();}catch{throw new VariantConnectionError('schema-mismatch','Unreadable research response');}
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Research request cancelled');
   return decodeResearchSourceSnapshot(data,variantId);
  }
 });
}
