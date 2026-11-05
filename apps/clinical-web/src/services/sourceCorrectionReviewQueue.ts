import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';
import type {ResearchRoleState} from './researchRole';

export type SourceCorrectionReviewItem=Readonly<{
 id:string;referenceId:string;variantId:string;
 field:'title'|'type'|'category'|'journal'|'year'|'doi'|'pmid';
 recordedValue:string|null;proposedValue:string;rationale:string;
 createdAt:string;createdBy:string;
}>;
export class SourceReviewQueueError extends Error {
 constructor(public readonly kind:'unavailable'|'access-denied'|'sign-in-required',message:string){super(message);this.name='SourceReviewQueueError';}
}
const positive=/^[1-9][0-9]{0,17}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields=new Set(['title','type','category','journal','year','doi','pmid']);
function id(value:unknown):string|null {
 if(typeof value==='string'&&positive.test(value))return value;
 if(typeof value==='number'&&Number.isSafeInteger(value)&&value>0)return String(value);
 return null;
}
/** Fail closed on malformed records; no guessed source identity or review status. */
export function decodeSourceReviewQueue(payload:unknown):readonly SourceCorrectionReviewItem[]{
 if(!Array.isArray(payload)||payload.length>21)
  throw new SourceReviewQueueError('unavailable','Invalid review queue response.');
 const seen=new Set<string>();
 return payload.map((row:unknown)=>{
  if(!row||typeof row!=='object'||Array.isArray(row))
   throw new SourceReviewQueueError('unavailable','Invalid review record.');
  const v=row as Record<string,unknown>;
  const reviewId=id(v.id),referenceId=id(v.reference_id),variantId=id(v.variant_id);
  if(!reviewId||!referenceId||!variantId||seen.has(reviewId)||v.status!=='submitted'||
   !fields.has(String(v.field_name))||
   !(v.recorded_value===null||typeof v.recorded_value==='string')||
   typeof v.proposed_value!=='string'||!v.proposed_value.trim()||v.proposed_value.length>200||
   typeof v.rationale!=='string'||v.rationale.trim().length<15||v.rationale.length>900||
   typeof v.created_by!=='string'||!uuid.test(v.created_by)||
   typeof v.created_at!=='string'||!Number.isFinite(Date.parse(v.created_at)))
    throw new SourceReviewQueueError('unavailable','Invalid review record metadata.');
  seen.add(reviewId);
  return Object.freeze({
   id:reviewId,referenceId,variantId,field:v.field_name as SourceCorrectionReviewItem['field'],
   recordedValue:v.recorded_value as string|null,proposedValue:v.proposed_value as string,
   rationale:v.rationale as string,createdAt:v.created_at,createdBy:v.created_by as string
  });
 });
}
export function canReadSourceReviewQueue(enabled:boolean,phase:string,role:Pick<ResearchRoleState,'phase'|'role'>):boolean{
 return enabled&&phase==='signed-in'&&role.phase==='verified'&&
  (role.role==='reviewer'||role.role==='administrator');
}
export function createSourceReviewQueue(config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,transport:typeof fetch=fetch){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async list(signal?:AbortSignal):Promise<readonly SourceCorrectionReviewItem[]>{
   if(signal?.aborted)throw new SourceReviewQueueError('unavailable','Review request interrupted.');
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject)
    throw new SourceReviewQueueError('sign-in-required','Sign in to view the review queue.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceReviewQueueError('sign-in-required','Research session is no longer valid.');
   const url=new URL('/rest/v1/nfq_source_correction_proposals',endpoint);
   url.search=new URLSearchParams({
    select:'id,reference_id,variant_id,field_name,recorded_value,proposed_value,rationale,created_by,created_at,status',
    status:'eq.submitted',order:'created_at.asc,id.asc',limit:'21'
   }).toString();
   let response:Response;
   try {
    response=await transport(url.toString(),{
     method:'GET',credentials:'omit',cache:'no-store',redirect:'error',signal,
     headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'}
    });
   }catch{
    throw new SourceReviewQueueError('unavailable','Review queue cannot be reached.');
   }
   if(signal?.aborted||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceReviewQueueError('unavailable','Review request no longer belongs to this session.');
   if(response.status===401)throw new SourceReviewQueueError('sign-in-required','Research session expired.');
   if(response.status===403)throw new SourceReviewQueueError('access-denied','Review access was denied.');
   if(!response.ok)throw new SourceReviewQueueError('unavailable','Review queue is not available.');
   let payload:unknown;
   try{payload=await response.json();}
   catch{throw new SourceReviewQueueError('unavailable','Review response could not be read.');}
   if(signal?.aborted||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceReviewQueueError('unavailable','Review request was superseded.');
   const rows=decodeSourceReviewQueue(payload);
   // Prevent hidden truncation from appearing to be a complete queue.
   if(rows.length>20)throw new SourceReviewQueueError('unavailable','Review queue exceeds current page size.');
   return rows;
  }
 };
}
