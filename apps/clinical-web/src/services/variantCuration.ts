import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';
import type {ResearchRoleState} from './researchRole';

export const CURATION_FIELDS=['legacy_name','protein_name','cdna_name','alt_names'] as const;
export type VariantCurationField=typeof CURATION_FIELDS[number];
export type VariantCurationDecision='approved'|'rejected';
export type VariantCurationDraft=Readonly<{
 variantId:string;field:VariantCurationField;proposedValue:string;
 rationale:string;sourceReference:string;
}>;
export type VariantCurationProposal=Readonly<{
 id:string;variantId:string;field:VariantCurationField;
 recordedValue:string|null;proposedValue:string;rationale:string;
 sourceReference:string;submittedBy:string;submittedAt:string;status:'submitted';
}>;
export class VariantCurationError extends Error{
 constructor(public readonly kind:'invalid'|'not-authorized'|'unavailable'|'uncertain',message:string){
  super(message);this.name='VariantCurationError';
 }
}
const idPattern=/^[1-9][0-9]{0,17}$/;
const uuidPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const control=/[\u0000-\u001f]/;
export function canOfferVariantCuration(enabled:boolean,authPhase:string,role:Pick<ResearchRoleState,'phase'|'role'>):boolean{
 return enabled&&authPhase==='signed-in'&&role.phase==='verified'&&
  (role.role==='contributor'||role.role==='reviewer'||role.role==='administrator');
}
export function canReviewVariantCuration(enabled:boolean,authPhase:string,role:Pick<ResearchRoleState,'phase'|'role'>):boolean{
 return enabled&&authPhase==='signed-in'&&role.phase==='verified'&&
  (role.role==='reviewer'||role.role==='administrator');
}
export function validCurationDraft(input:VariantCurationDraft):boolean{
 return idPattern.test(input.variantId)&&CURATION_FIELDS.includes(input.field)&&
  input.proposedValue.trim().length>=2&&input.proposedValue.trim().length<=500&&!control.test(input.proposedValue.trim())&&
  input.rationale.trim().length>=20&&input.rationale.trim().length<=900&&!control.test(input.rationale.trim())&&
  input.sourceReference.trim().length>=8&&input.sourceReference.trim().length<=250&&!control.test(input.sourceReference.trim());
}
function validId(value:unknown):string|null{
 return typeof value==='string'&&idPattern.test(value)?value:
  typeof value==='number'&&Number.isSafeInteger(value)&&value>0?String(value):null;
}
/** No implicit trust in a queue row returned by the network. */
export function decodeVariantCurationQueue(raw:unknown,expectedVariant:string):readonly VariantCurationProposal[]{
 if(!Array.isArray(raw)||raw.length>21||!idPattern.test(expectedVariant))
  throw new VariantCurationError('unavailable','Invalid variant curation queue.');
 const seen=new Set<string>();
 return raw.map(value=>{
  if(!value||typeof value!=='object'||Array.isArray(value))
   throw new VariantCurationError('unavailable','Invalid curation record.');
  const v=value as Record<string,unknown>,id=validId(v.id),variantId=validId(v.variant_id);
  if(!id||!variantId||variantId!==expectedVariant||seen.has(id)||v.status!=='submitted'||
     !CURATION_FIELDS.includes(v.field_name as VariantCurationField)||
     !(v.recorded_value===null||typeof v.recorded_value==='string')||
     typeof v.proposed_value!=='string'||v.proposed_value.trim().length<2||v.proposed_value.length>500||
     typeof v.rationale!=='string'||v.rationale.length>900||
     typeof v.source_reference!=='string'||v.source_reference.length>250||
     typeof v.submitted_by!=='string'||!uuidPattern.test(v.submitted_by)||
     typeof v.submitted_at!=='string'||!Number.isFinite(Date.parse(v.submitted_at)))
    throw new VariantCurationError('unavailable','Invalid curation record metadata.');
  seen.add(id);
  return Object.freeze({
   id,variantId,field:v.field_name as VariantCurationField,
   recordedValue:v.recorded_value as string|null,proposedValue:v.proposed_value,
   rationale:v.rationale,sourceReference:v.source_reference,
   submittedBy:v.submitted_by,submittedAt:v.submitted_at,status:'submitted' as const
  });
 });
}
export function validCurationDecision(proposal:VariantCurationProposal,decision:VariantCurationDecision,note:string,actor:string):boolean{
 return idPattern.test(proposal.id)&&uuidPattern.test(actor)&&uuidPattern.test(proposal.submittedBy)&&
  actor.toLowerCase()!==proposal.submittedBy.toLowerCase()&&
  (decision==='approved'||decision==='rejected')&&note.trim().length>=15&&note.trim().length<=900&&
  !control.test(note.trim());
}
export function createVariantCurationClient(
 config:ReadOnlyConfig,session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 async function authorized(){
  const subject=session.state.userId;
  if(session.state.phase!=='signed-in'||!subject)
   throw new VariantCurationError('not-authorized','A verified research account is required.');
  const token=await session.getAccessToken();
  if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
   throw new VariantCurationError('not-authorized','The session changed before the request.');
  return {subject,token};
 }
 function sameSubject(subject:string){
  if(session.state.phase!=='signed-in'||session.state.userId!==subject)
   throw new VariantCurationError('uncertain','Account changed. Reload the curation workspace before continuing.');
 }
 async function sendRpc(name:string,body:Record<string,unknown>):Promise<unknown>{
  const {subject,token}=await authorized();
  let response:Response;
  try{
   response=await transport(new URL('/rest/v1/rpc/'+name,endpoint).toString(),{
    method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body)
   });
  }catch{
   throw new VariantCurationError('uncertain','Server result uncertain. Inspect the queue before retrying.');
  }
  sameSubject(subject);
  if(response.status===401||response.status===403)
   throw new VariantCurationError('not-authorized','The server denied this curation operation.');
  if(!response.ok)
   throw new VariantCurationError('unavailable','The server did not confirm the operation. Reload the queue before retrying.');
  let payload:unknown;
  try{payload=response.status===204?null:await response.json();}
  catch{throw new VariantCurationError('uncertain','The server response could not be verified.');}
  sameSubject(subject);
  return payload;
 }
 return {
  async submit(input:VariantCurationDraft):Promise<string>{
   if(!validCurationDraft(input))
    throw new VariantCurationError('invalid','Enter a supported field, a proposed value, source reference and 20+ character rationale.');
   const result=await sendRpc('nfq_submit_variant_curation',{
    p_variant_id:input.variantId,p_field_name:input.field,
    p_proposed_value:input.proposedValue.trim(),p_rationale:input.rationale.trim(),
    p_source_reference:input.sourceReference.trim()
   });
   const id=validId(result);
   if(!id)throw new VariantCurationError('uncertain','The proposal ID could not be verified. Reload the queue.');
   return id;
  },
  async pending(variantId:string,signal?:AbortSignal):Promise<readonly VariantCurationProposal[]>{
   if(!idPattern.test(variantId))throw new VariantCurationError('invalid','Invalid selected variant.');
   const {subject,token}=await authorized();
   const url=new URL('/rest/v1/nfq_variant_curation_proposals',endpoint);
   url.search=new URLSearchParams({
    select:'id,variant_id,field_name,recorded_value,proposed_value,rationale,source_reference,submitted_by,submitted_at,status',
    variant_id:'eq.'+variantId,status:'eq.submitted',order:'submitted_at.asc,id.asc',limit:'21'
   }).toString();
   let response:Response;
   try{response=await transport(url.toString(),{
    method:'GET',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'},
    credentials:'omit',cache:'no-store',redirect:'error',signal
   });}
   catch{throw new VariantCurationError('unavailable','Curation queue unavailable.');}
   sameSubject(subject);
   if(signal?.aborted)throw new VariantCurationError('unavailable','Curation request was interrupted.');
   if(!response.ok)throw new VariantCurationError('unavailable','Curation queue was not available to this account.');
   let rows:unknown;
   try{rows=await response.json();}catch{throw new VariantCurationError('unavailable','Invalid curation response.');}
   sameSubject(subject);
   const proposals=decodeVariantCurationQueue(rows,variantId);
   if(proposals.length>20)throw new VariantCurationError('unavailable','The queue is larger than one page.');
   return proposals;
  },
  async decide(proposal:VariantCurationProposal,decision:VariantCurationDecision,note:string):Promise<void>{
   const actor=session.state.userId;
   if(!actor||!validCurationDecision(proposal,decision,note,actor))
    throw new VariantCurationError('invalid','Independent reviewer and a review note of 15–900 characters are required.');
   const response=await sendRpc('nfq_decide_variant_curation',{
    p_proposal_id:proposal.id,p_decision:decision,p_review_note:note.trim()
   });
   if(response!==null&&response!=='')
    throw new VariantCurationError('uncertain','Unexpected review confirmation. Reload the queue.');
  }
 };
}
