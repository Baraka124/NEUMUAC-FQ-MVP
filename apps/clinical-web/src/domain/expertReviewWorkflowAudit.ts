import type {ExpertRegistryRecord} from '../services/expertRegistryService';
import type {ExpertExtraction} from './expertBenchmarkAdjudication';
import {PUBLISHED_CFTR_REFERENCE_CASES} from './publishedCftrReferenceCases';

/** 14H204: independent, deterministic verification of the workflow history.
 * Authenticated identities and timestamps MUST originate from trusted server
 * responses; this function cannot establish that a client-supplied record
 * came from that server. No patient or efficacy inference is performed.
 */
export type ReviewWorkflowState=
 'awaiting-first-reviewer'|'awaiting-second-reviewer'|
 'awaiting-adjudication'|'awaiting-attested-mapping'|'mapping-recorded';
export interface ReviewWorkflowAudit {
 readonly state:ReviewWorkflowState;
 readonly caseId:string;
 readonly variantId:string;
 readonly evidencePmid:string;
 readonly eventCount:number;
 readonly reviewerCount:number;
 readonly disagreements:readonly string[];
 readonly reviewChainComplete:boolean;
 readonly externallyValidated:false;
}
const validTime=(x:string)=>Number.isFinite(Date.parse(x));
const canonicalId=(x:string)=>/^[1-9][0-9]{0,17}$/.test(x);
const contextFields=['genotypeContext','endpoint','modelOrCohort','finding','claimId','sourceLocator'] as const;
function disagreements(a:ExpertExtraction,b:ExpertExtraction):string[]{
 return contextFields.filter(key=>{
  const x=a[key],y=b[key];
  if(x===null||y===null)return x!==y;
  return x.trim().toLowerCase()!==y.trim().toLowerCase();
 });
}
export function inspectExpertWorkflow(record:ExpertRegistryRecord):ReviewWorkflowAudit {
 const bibliography=PUBLISHED_CFTR_REFERENCE_CASES.find(c=>c.id===record.caseId);
 if(!bibliography||!canonicalId(record.variantId)||record.extracts.length>2||
  record.source!=='nfq-authenticated-expert-registry-v1')
  throw new Error('Unrecognized expert workflow identity');
 const extracts=[...record.extracts];
 const identity=new Set<string>();
 for(const e of extracts){
  if(e.caseId!==record.caseId||e.variantId!==record.variantId||
   e.pmid!==bibliography.pmid||!validTime(e.submittedAt)||
   identity.has(e.reviewerId.toLowerCase()))
   throw new Error('Wrong-publication or repeated expert submission');
  identity.add(e.reviewerId.toLowerCase());
 }
 const issues=extracts.length===2?disagreements(extracts[0]!,extracts[1]!):[];
 const adjudication=record.adjudication;
 if(adjudication){
  if(extracts.length!==2||issues.length===0||adjudication.caseId!==record.caseId||
   adjudication.variantId!==record.variantId||identity.has(adjudication.adjudicatorId.toLowerCase())||
   !validTime(adjudication.submittedAt)||
   new Set(adjudication.acceptedReviewerIds.map(x=>x.toLowerCase())).size!==2||
   !adjudication.acceptedReviewerIds.every(x=>identity.has(x.toLowerCase()))||
   extracts.some(e=>Date.parse(adjudication.submittedAt)<=Date.parse(e.submittedAt)))
   throw new Error('Adjudication violates independent reviewer chronology');
 }
 const mapping=record.mapping;
 if(mapping){
  const lastReview=adjudication?.submittedAt??extracts[1]?.submittedAt;
  if(extracts.length!==2||(issues.length>0&&!adjudication)||
   mapping.caseId!==record.caseId||mapping.variantId!==record.variantId||
   !lastReview||!validTime(mapping.attestedAt)||
   Date.parse(mapping.attestedAt)<=Date.parse(lastReview)||
   identity.has(mapping.attestedBy.toLowerCase())||
   mapping.attestedBy.toLowerCase()===adjudication?.adjudicatorId.toLowerCase())
   throw new Error('Mapping bypasses completed independent review chronology');
 }
 if(record.audit.length!==extracts.length+(adjudication?1:0)+(mapping?1:0))
  throw new Error('Expert audit history is incomplete');
 const events=[...record.audit].sort((a,b)=>Date.parse(a.at)-Date.parse(b.at));
 if(events.some((e,i)=>!validTime(e.at)||(i>0&&Date.parse(e.at)<Date.parse(events[i-1]!.at))))
  throw new Error('Invalid expert audit chronology');
 for(const e of extracts)
  if(!events.some(a=>a.action==='extraction-submitted'&&a.actorId===e.reviewerId&&a.at===e.submittedAt))
   throw new Error('Missing trusted expert submission event');
 if(adjudication&&!events.some(a=>a.action==='adjudication-submitted'&&
  a.actorId===adjudication.adjudicatorId&&a.at===adjudication.submittedAt))
  throw new Error('Missing trusted adjudication event');
 if(mapping&&!events.some(a=>a.action==='mapping-attested'&&
  a.actorId===mapping.attestedBy&&a.at===mapping.attestedAt))
  throw new Error('Missing trusted source mapping event');
 const state:ReviewWorkflowState=extracts.length===0?'awaiting-first-reviewer':
  extracts.length===1?'awaiting-second-reviewer':
  issues.length>0&&!adjudication?'awaiting-adjudication':
  !mapping?'awaiting-attested-mapping':'mapping-recorded';
 return Object.freeze({state,caseId:record.caseId,variantId:record.variantId,
  evidencePmid:bibliography.pmid,eventCount:events.length,reviewerCount:extracts.length,
  disagreements:Object.freeze(issues),reviewChainComplete:state==='mapping-recorded',
  externallyValidated:false as const});
}
