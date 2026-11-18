import type {ReadOnlyConfig,ReadSessionProvider} from './liveVariants';
import {validateReadOnlyConfig,VariantConnectionError} from './liveVariants';
import type {ExpertExtraction,ExpertAdjudication} from '../domain/expertBenchmarkAdjudication';
import type {AttestedBenchmarkMapping} from '../domain/scientificBenchmarkComparison';
import {PUBLISHED_CFTR_REFERENCE_CASES} from '../domain/publishedCftrReferenceCases';

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
 // The backend owns reviewer identity, timestamps and authorization. Still
 // reject tampered/partial responses before they reach the research engine.
 const publication=PUBLISHED_CFTR_REFERENCE_CASES.find(p=>p.id===caseId);
 const timestamp=(v:unknown):v is string=>
  typeof v==='string'&&Number.isFinite(Date.parse(v))&&v.length<=64;
 const scienceText=(v:unknown,min=3,max=1200):v is string=>
  typeof v==='string'&&v.trim()===v&&v.length>=min&&v.length<=max&&
  !/[\\u0000-\\u001f\\u007f]/.test(v);
 const findings=new Set(['supports','does-not-support','inconclusive','not-assessable']);
 const reviewerIds=new Set<string>();
 if(!publication)throw new VariantConnectionError('schema-mismatch','Unknown expert reference case');
 for(const record of raw.extracts){
  if(!isObject(record)||record.caseId!==caseId||record.variantId!==variantId||
   record.pmid!==publication.pmid||!UUID.test(String(record.reviewerId))||
   !timestamp(record.submittedAt)||!scienceText(record.sourceLocator,3,240)||
   !scienceText(record.genotypeContext,3,300)||!scienceText(record.endpoint,3,160)||
   !scienceText(record.modelOrCohort,3,300)||!scienceText(record.methodNotes,3,1200)||
   !findings.has(String(record.finding))||
   !(record.claimId===null||UUID.test(String(record.claimId)))||
   reviewerIds.has(String(record.reviewerId)))
   throw new VariantConnectionError('schema-mismatch','Unverified expert extraction record');
  reviewerIds.add(String(record.reviewerId));
 }
 if(raw.adjudication){
  const a=raw.adjudication;
  const accepted=Array.isArray(a.acceptedReviewerIds)?a.acceptedReviewerIds:[];
  if(raw.extracts.length!==2||a.caseId!==caseId||a.variantId!==variantId||
   !UUID.test(String(a.adjudicatorId))||reviewerIds.has(String(a.adjudicatorId))||
   !timestamp(a.submittedAt)||!findings.has(String(a.finalFinding))||
   !scienceText(a.sourceLocator,3,240)||!scienceText(a.justification,20,1200)||
   accepted.length!==2||new Set(accepted).size!==2||
   !accepted.every(x=>typeof x==='string'&&reviewerIds.has(x)))
   throw new VariantConnectionError('schema-mismatch','Unverified independent adjudication');
 }
 if(raw.mapping){
  const m=raw.mapping;
  const acceptedFindings=['reported-response','reported-no-response','mixed','inconclusive'];
  if(raw.extracts.length!==2||m.caseId!==caseId||m.variantId!==variantId||
   m.mappingVersion!==1||!UUID.test(String(m.platformClaimId))||
   !UUID.test(String(m.attestedBy))||reviewerIds.has(String(m.attestedBy))||
   (raw.adjudication&&m.attestedBy===raw.adjudication.adjudicatorId)||
   !timestamp(m.attestedAt)||!findings.has(String(m.expertFinding))||
   !acceptedFindings.includes(String(m.claimFinding))||
   !(m.expertReportedFinding===null||
     acceptedFindings.includes(String(m.expertReportedFinding)))||
   !scienceText(m.genotypeContext,3,300)||!scienceText(m.endpointCode,3,80)||
   !scienceText(m.endpointTimepoint,3,80)||!scienceText(m.sourceLocator,3,240))
   throw new VariantConnectionError('schema-mismatch','Unverified scientific comparison mapping');
 }

 const audit=raw.audit as unknown[];
 if(audit.some(e=>!isObject(e)||!UUID.test(String(e.eventId))||
  !UUID.test(String(e.actorId))||
  !['extraction-submitted','adjudication-submitted','mapping-attested'].includes(String(e.action))||
  !timestamp(e.at)))
  throw new VariantConnectionError('schema-mismatch','Malformed expert audit trail');
 const eventRows=audit as Record<string,unknown>[];
 if(new Set(eventRows.map(e=>e.eventId)).size!==eventRows.length||
  eventRows.length!==raw.extracts.length+(raw.adjudication?1:0)+(raw.mapping?1:0)||
  [...reviewerIds].some(id=>!eventRows.some(e=>e.action==='extraction-submitted'&&e.actorId===id))||
  (raw.adjudication&&!eventRows.some(e=>e.action==='adjudication-submitted'&&
    e.actorId===raw.adjudication?.adjudicatorId))||
  (raw.mapping&&!eventRows.some(e=>e.action==='mapping-attested'&&
    e.actorId===raw.mapping?.attestedBy)))
  throw new VariantConnectionError('schema-mismatch','Expert review audit does not match submissions');
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
