/**
 * Live, READ-ONLY historical record metadata for a single CFTR variant.
 * Explicitly exclude clinician identities, free-text notes, snapshot JSON,
 * institutions, session IDs, raw contradiction details and resolution notes.
 * A recorded event is NOT proof of an independently verified audit chain.
 */
import {validateReadOnlyConfig,type ReadOnlyConfig,VariantConnectionError} from './liveVariants';

export interface ValidationEvent {
  readonly id:number;
  readonly variantId:string;
  readonly action:string;
  readonly at:string|null;
  readonly confidence:string|null;
  readonly recordedClass:string|null;
}
export interface ConflictEvent {
  readonly id:number;
  readonly variantId:string;
  readonly field:string;
  readonly severity:string|null;
  readonly resolved:boolean;
  readonly detectedAt:string|null;
  readonly resolvedAt:string|null;
}
export interface ResearchHistory {
  readonly validations:readonly ValidationEvent[];
  readonly conflicts:readonly ConflictEvent[];
}
const VALIDATION_FIELDS='id,variant_id,action,created_at,confidence_level,snapshot_cftr_class';
const CONFLICT_FIELDS='id,variant_id,field,severity,resolved,detected_at,resolved_at';
function scalar(value:unknown):string|null {
  return typeof value==='string'&&value.trim()?value.trim():null;
}
function base(row:unknown,kind:string):Record<string,unknown>{
  if(!row||typeof row!=='object'||Array.isArray(row))
    throw new VariantConnectionError('schema-mismatch','Unexpected '+kind+' response');
  const fields=row as Record<string,unknown>;
  if(typeof fields.id!=='number'||!Number.isSafeInteger(fields.id)||fields.id<0||
    !['number','string'].includes(typeof fields.variant_id))
    throw new VariantConnectionError('schema-mismatch','Invalid '+kind+' identity');
  return fields;
}
export function decodeValidationEvent(input:unknown):ValidationEvent{
  const f=base(input,'validation');
  return Object.freeze({
    id:f.id as number,variantId:String(f.variant_id),
    action:scalar(f.action)||'Unspecified action',
    at:scalar(f.created_at),
    confidence:scalar(f.confidence_level),
    recordedClass:scalar(f.snapshot_cftr_class)
  });
}
export function decodeConflictEvent(input:unknown):ConflictEvent{
  const f=base(input,'conflict');
  if(typeof f.resolved!=='boolean')throw new VariantConnectionError('schema-mismatch','Invalid conflict status');
  return Object.freeze({
    id:f.id as number,variantId:String(f.variant_id),field:scalar(f.field)||'Field not recorded',
    severity:scalar(f.severity),resolved:f.resolved,
    detectedAt:scalar(f.detected_at),resolvedAt:scalar(f.resolved_at)
  });
}
export function createLiveResearchHistorySource(config:ReadOnlyConfig,transport:typeof fetch=fetch){
  const root=validateReadOnlyConfig(config);
  const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
  if(!config.publishableKey.startsWith('sb_publishable_'))
    headers.Authorization='Bearer '+config.publishableKey;
  async function read<T>(
    table:'validation_history'|'contradictions',
    fields:string,id:string,decode:(raw:unknown)=>T,signal?:AbortSignal
  ):Promise<readonly T[]>{
    const url=new URL('/rest/v1/'+table,root);
    url.search=new URLSearchParams({
      select:fields,variant_id:'eq.'+id,order:'id.desc',limit:'201'
    }).toString();
    let response:Response;
    try {
      response=await transport(url.toString(),{method:'GET',headers,credentials:'omit',cache:'no-store',redirect:'error',signal});
    }catch(error){
      if(signal?.aborted)throw error;
      throw new VariantConnectionError('request-failed','Historical research register unavailable');
    }
    if(response.status===401||response.status===403)
      throw new VariantConnectionError('access-denied','Historical records unavailable');
    if(!response.ok)
      throw new VariantConnectionError('request-failed','Historical research lookup failed');
    const rows:unknown=await response.json();
    if(!Array.isArray(rows))throw new VariantConnectionError('schema-mismatch','Unexpected historical research payload');
    // Never silently portray a truncated fetch as the full history.
    if(rows.length>200)throw new VariantConnectionError('request-failed','Historical record count exceeds the supported complete view');
    const decoded=rows.map(decode);
    if(decoded.some(event=>(event as {variantId:string}).variantId!==id))
      throw new VariantConnectionError('schema-mismatch','History response contained a different variant');
    return decoded;
  }
  return Object.freeze({
    async get(variantId:string,signal?:AbortSignal):Promise<ResearchHistory>{
      if(!/^\d{1,18}$/.test(variantId))
        throw new VariantConnectionError('invalid-configuration','Invalid variant ID');
      const [validations,conflicts]=await Promise.all([
        read('validation_history',VALIDATION_FIELDS,variantId,decodeValidationEvent,signal),
        read('contradictions',CONFLICT_FIELDS,variantId,decodeConflictEvent,signal)
      ]);
      return Object.freeze({validations,conflicts});
    }
  });
}
