import type {ReadOnlyConfig,ReadSessionProvider} from './liveVariants';
import {validateReadOnlyConfig,VariantConnectionError} from './liveVariants';
import type {ExpertExtraction,ExpertAdjudication} from '../domain/expertBenchmarkAdjudication';
import type {AttestedBenchmarkMapping} from '../domain/scientificBenchmarkComparison';

/** 14H200. Authenticated transport for a server-side researcher registry.
 * The RPC is a strict deployment prerequisite. This client DOES NOT create
 * or trust local reviewer IDs, nor claim server persistence on its own.
 */
export type ExpertRegistryAction='list'|'submit-extraction'|'adjudicate'|'attest-mapping';
export interface ExpertRegistryRecord {
 readonly caseId:string;readonly variantId:string;
 readonly extracts:readonly ExpertExtraction[];
 readonly adjudication:ExpertAdjudication|null;
 readonly mapping:AttestedBenchmarkMapping|null;
 readonly audit:readonly {readonly eventId:string;readonly action:string;readonly actorId:string;readonly at:string}[];
 readonly source:'nfq-authenticated-expert-registry-v1';
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const numeric=/^[1-9][0-9]{0,17}$/;
function isObject(v:unknown):v is Record<string,unknown>{
 return v!==null&&typeof v==='object'&&!Array.isArray(v);
}
function verifiedRecord(raw:unknown,caseId:string,variantId:string):ExpertRegistryRecord{
 if(!isObject(raw)||raw.source!=='nfq-authenticated-expert-registry-v1'||
  raw.caseId!==caseId||raw.variantId!==variantId||
  !Array.isArray(raw.extracts)||raw.extracts.length>2||
  !Array.isArray(raw.audit)||raw.audit.length>1000||
  !(raw.adjudication===null||isObject(raw.adjudication))||
  !(raw.mapping===null||isObject(raw.mapping)))
  throw new VariantConnectionError('schema-mismatch','Unverified expert review registry response');
 // This parser checks structural envelope only; the trusted RPC must enforce
 // actor ownership, reviewer separation, append-only audit and exact provenance.
 const audit=raw.audit as unknown[];
 if(audit.some(e=>!isObject(e)||!UUID.test(String(e.eventId))||
  !UUID.test(String(e.actorId))||
  !['extraction-submitted','adjudication-submitted','mapping-attested'].includes(String(e.action))||
  typeof e.at!=='string'||!Number.isFinite(Date.parse(e.at))))
  throw new VariantConnectionError('schema-mismatch','Malformed expert audit trail');
 return Object.freeze({
  caseId,variantId,
  extracts:Object.freeze(raw.extracts as ExpertExtraction[]),
  adjudication:raw.adjudication as ExpertAdjudication|null,
  mapping:raw.mapping as AttestedBenchmarkMapping|null,
  audit:Object.freeze(audit as ExpertRegistryRecord['audit']),
  source:'nfq-authenticated-expert-registry-v1' as const
 });
}
export function createExpertRegistryService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 async function request(action:ExpertRegistryAction,caseId:string,variantId:string,payload:unknown,
  signal?:AbortSignal):Promise<ExpertRegistryRecord>{
  if(!/^[a-z0-9][a-z0-9-]{2,100}$/.test(caseId)||!numeric.test(variantId))
   throw new VariantConnectionError('invalid-configuration','Invalid exact variant or publication challenge');
  const token=await session.getAccessToken();
  if(!token||token===config.publishableKey||
   !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
   throw new VariantConnectionError('authentication-required','Authenticated expert research session required');
  let response:Response;
  try{
   response=await transport(new URL('/rest/v1/rpc/nfq_expert_reference_registry',root).toString(),{
    method:'POST',
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_action:action,p_case_id:caseId,p_variant_id:variantId,p_payload:payload}),
    cache:'no-store',credentials:'omit',redirect:'error',signal
   });
  }catch(e){
   if(signal?.aborted)throw e;
   throw new VariantConnectionError('request-failed','Expert registry unavailable');
  }
  if(response.status===401||response.status===403)
   throw new VariantConnectionError('access-denied','Expert registry permissions denied');
  if(!response.ok)throw new VariantConnectionError('request-failed','Expert registry operation not confirmed');
  let body:unknown;
  try{body=await response.json();}
  catch{throw new VariantConnectionError('schema-mismatch','Invalid expert registry response');}
  return verifiedRecord(body,caseId,variantId);
 }
 return Object.freeze({
  list:(caseId:string,variantId:string,signal?:AbortSignal)=>
   request('list',caseId,variantId,null,signal),
  submitExtraction:(caseId:string,variantId:string,data:Omit<ExpertExtraction,'reviewerId'|'submittedAt'>)=>
   request('submit-extraction',caseId,variantId,data),
  adjudicate:(caseId:string,variantId:string,data:Omit<ExpertAdjudication,'adjudicatorId'|'submittedAt'>)=>
   request('adjudicate',caseId,variantId,data),
  attestMapping:(caseId:string,variantId:string,data:Omit<AttestedBenchmarkMapping,'attestedBy'|'attestedAt'>)=>
   request('attest-mapping',caseId,variantId,data)
 });
}
