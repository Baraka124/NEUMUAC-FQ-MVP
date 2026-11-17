import {
 validateReadOnlyConfig,VariantConnectionError,
 type ReadOnlyConfig,type ReadSessionProvider
} from './liveVariants';
import type {ApprovedDatasetSnapshot} from './approvedResearchDataset';
import {ADJUDICATION_SOURCE,pairKey,type StudyAdjudication,
 type AdjudicationDisposition} from '../domain/studyAdjudication';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const tokenFormat=/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const dispositions=new Set(['same-study','distinct-studies','insufficient-evidence']);
const statuses=new Set(['pending','approved','rejected','superseded']);
function broken(message:string):never{
 throw new VariantConnectionError('schema-mismatch',message);
}
function object(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))broken('Invalid scientific adjudication structure');
 return value as Record<string,unknown>;
}
function clean(value:unknown,min:number,max:number):value is string{
 return typeof value==='string'&&value.length>=min&&value.length<=max&&
  value===value.trim()&&!/[\u0000-\u001f\u007f]/.test(value);
}
export function validProposal(
 claimA:string,claimB:string,disposition:AdjudicationDisposition,
 rationale:string,evidenceLocator:string
):boolean{
 return uuid.test(claimA)&&uuid.test(claimB)&&claimA!==claimB&&
  dispositions.has(disposition)&&clean(rationale,30,900)&&
  clean(evidenceLocator,8,240);
}
export function validReviewNote(note:string):boolean{return clean(note,20,500);}
function readRecord(input:unknown,validClaimIds:ReadonlySet<string>):StudyAdjudication{
 const row=object(input);
 const a=row.claimA,b=row.claimB;
 if(typeof a!=='string'||typeof b!=='string'||!uuid.test(a)||!uuid.test(b)||
  a>=b||!validClaimIds.has(a)||!validClaimIds.has(b))
  broken('Study adjudication is not linked to two current approved source claims');
 if(typeof row.id!=='string'||!uuid.test(row.id)||
  typeof row.revision!=='number'||!Number.isSafeInteger(row.revision)||
  row.revision<1||row.revision>100||
  !dispositions.has(row.disposition as string)||
  !statuses.has(row.status as string)||
  !clean(row.rationale,30,900)||!clean(row.evidenceLocator,8,240)||
  typeof row.reviewCount!=='number'||!Number.isSafeInteger(row.reviewCount)||
  row.reviewCount<0||row.reviewCount>2||
  typeof row.submittedByMe!=='boolean'||typeof row.canReview!=='boolean'||
  typeof row.submittedAt!=='string'||!Number.isFinite(Date.parse(row.submittedAt))||
  (row.decidedAt!==null&&(typeof row.decidedAt!=='string'||
   !Number.isFinite(Date.parse(row.decidedAt))))||
  (row.status==='approved'&&row.reviewCount!==2)||
  (row.status==='pending'&&row.reviewCount>1)||
  (row.status==='approved'&&row.decidedAt===null)||
  (row.status==='pending'&&row.decidedAt!==null))
  broken('Invalid independent adjudication review seals or metadata');
 return Object.freeze({
  id:row.id,claimA:a,claimB:b,revision:row.revision,
  disposition:row.disposition as AdjudicationDisposition,rationale:row.rationale,
  evidenceLocator:row.evidenceLocator,status:row.status as StudyAdjudication['status'],
  submittedAt:row.submittedAt,decidedAt:row.decidedAt as string|null,
  reviewCount:row.reviewCount,
  submittedByMe:row.submittedByMe,canReview:row.canReview
 });
}
export function decodeStudyAdjudications(
 raw:unknown,snapshot:ApprovedDatasetSnapshot
):readonly StudyAdjudication[]{
 const data=object(raw);
 if(data.source!==ADJUDICATION_SOURCE||!Array.isArray(data.records)||
  data.records.length>250||data.total!==data.records.length)
  broken('Adjudication inventory is incomplete');
 const eligible=new Set(snapshot.records.map(x=>x.claimId));
 const records=data.records.map((x:unknown)=>readRecord(x,eligible));
 const ids=new Set(records.map(x=>x.id));
 const pairs=new Set(records.map(x=>pairKey(x.claimA,x.claimB)));
 if(ids.size!==records.length||pairs.size!==records.length)
  broken('Repeated adjudication version for the same approved source pair');
 return Object.freeze(records);
}
export function createStudyAdjudicationsService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const origin=validateReadOnlyConfig(config);
 const rpcUrl=new URL('/rest/v1/rpc/nfq_study_adjudications',origin).toString();
 const invoke=async(body:Record<string,unknown>,signal?:AbortSignal):Promise<unknown>=>{
  const token=await session.getAccessToken();
  if(!token||token===config.publishableKey||!tokenFormat.test(token))
   throw new VariantConnectionError('authentication-required','Current research authentication required');
  let response:Response;
  try{
   response=await transport(rpcUrl,{
    method:'POST',
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     Accept:'application/json','content-type':'application/json'},
    body:JSON.stringify(body),credentials:'omit',cache:'no-store',redirect:'error',signal
   });
  }catch(error){
   if(signal?.aborted)throw error;
   throw new VariantConnectionError('request-failed','Scientific adjudication service unavailable');
  }
  if(signal?.aborted)throw new VariantConnectionError('request-failed','Request cancelled');
  if(response.status===401||response.status===403)
   throw new VariantConnectionError('access-denied','Current reviewer or contributor membership required');
  if(!response.ok)throw new VariantConnectionError('request-failed',
   response.status===409?'Adjudication changed. Refresh before resubmitting.':
    'Adjudication action was not accepted');
  try{return await response.json();}catch{
   throw new VariantConnectionError('schema-mismatch','Unreadable adjudication response');
  }
 };
 function decodeAction(raw:unknown):{id:string;revision:number;status:string}{
  const data=object(raw);
  if(data.source!==ADJUDICATION_SOURCE||typeof data.id!=='string'||
   !uuid.test(data.id)||typeof data.revision!=='number'||
   !Number.isInteger(data.revision)||data.revision<1||data.revision>100||
   !statuses.has(String(data.status)))
   broken('Unverified adjudication action receipt');
  return {id:data.id,revision:data.revision,status:data.status as string};
 }
 return Object.freeze({
  async list(snapshot:ApprovedDatasetSnapshot,signal?:AbortSignal){
   return decodeStudyAdjudications(await invoke({p_action:'list'},signal),snapshot);
  },
  async propose(
   claimA:string,claimB:string,disposition:AdjudicationDisposition,
   rationale:string,evidenceLocator:string,expectedRevision:number
  ){
   if(!validProposal(claimA,claimB,disposition,rationale,evidenceLocator)||
    !Number.isInteger(expectedRevision)||expectedRevision<0||expectedRevision>99)
    broken('Invalid scientific adjudication proposal');
   return decodeAction(await invoke({
    p_action:'propose',p_claim_a:claimA,p_claim_b:claimB,
    p_disposition:disposition,p_rationale:rationale,
    p_evidence_locator:evidenceLocator,p_expected_revision:expectedRevision
   }));
  },
  async review(
   adjudicationId:string,decision:'approve'|'reject',note:string,revision:number
  ){
   if(!uuid.test(adjudicationId)||!['approve','reject'].includes(decision)||
    !validReviewNote(note)||!Number.isInteger(revision)||revision<1||revision>100)
    broken('Invalid independent adjudication review');
   return decodeAction(await invoke({
    p_action:'review',p_adjudication_id:adjudicationId,
    p_review_decision:decision,p_rationale:note,p_expected_revision:revision
   }));
  }
 });
}
