import {validateAliasReview,type AliasReviewRecord,type AliasReviewState} from './aliasReviewContract';

export type AliasReviewAction='submit'|'begin-review'|'approve'|'reject';
export interface AliasReviewEvent {
 readonly proposalId:string;
 readonly action:AliasReviewAction;
 readonly actorId:string;
 readonly at:string;
 readonly rationale:string;
 readonly priorState:AliasReviewState|null;
 readonly nextState:AliasReviewState;
}
export interface ReviewActor {
 readonly id:string;
 readonly mayReview:boolean;
 readonly maySubmit:boolean;
}
/**
 * Design-time policy, not production authorization. RLS and authenticated
 * server verification are REQUIRED before exposing a write operation.
 */
export function assessAliasReviewTransition(
 proposal:AliasReviewRecord,actor:ReviewActor,
 action:AliasReviewAction,at:string,rationale:string
):{readonly permitted:boolean;readonly reasons:readonly string[];readonly event:AliasReviewEvent|null}{
 const reasons:string[]=[];
 if(validateAliasReview(proposal).length)reasons.push('Proposal provenance is incomplete.');
 if(!actor.id.trim()||!Number.isFinite(Date.parse(at)))reasons.push('Actor identity and event time are required.');
 if(!rationale.trim()||rationale.length>2000)reasons.push('A bounded rationale is required.');
 if(action==='submit')reasons.push('Submission belongs to the separate proposal creation operation.');
 const next:AliasReviewState=action==='begin-review'?'under-review':action==='approve'?'approved':'rejected';
 if(action==='begin-review'){
  if(proposal.state!=='proposed')reasons.push('Only proposed aliases may enter review.');
  if(!actor.mayReview)reasons.push('Reviewer authorization required.');
 }else if(action==='approve'||action==='reject'){
  if(proposal.state!=='under-review')reasons.push('Only aliases under review can receive a decision.');
  if(!actor.mayReview)reasons.push('Reviewer authorization required.');
  if(actor.id===proposal.submittedBy)reasons.push('A submitter cannot approve or reject their own proposal.');
 }
 const event=reasons.length?null:{proposalId:proposal.variantId+'|'+proposal.alias,
  action,actorId:actor.id,at,rationale,priorState:proposal.state,nextState:next};
 return {permitted:reasons.length===0,reasons,event};
}
/** Events must connect without gaps; this is validation only, not durable audit storage. */
export function verifyAliasReviewSequence(events:readonly AliasReviewEvent[]):boolean{
 if(!events.length)return false;
 const id=events[0].proposalId;
 let state:AliasReviewState='proposed';
 let lastTime=-Infinity;
 for(const event of events){
  const t=Date.parse(event.at);
  if(event.proposalId!==id||!Number.isFinite(t)||t<=lastTime||
    event.priorState!==state||!event.actorId.trim()||!event.rationale.trim())return false;
  if(state==='proposed'&&event.action==='begin-review'&&event.nextState==='under-review')state='under-review';
  else if(state==='under-review'&&event.action==='approve'&&event.nextState==='approved')state='approved';
  else if(state==='under-review'&&event.action==='reject'&&event.nextState==='rejected')state='rejected';
  else return false;
  lastTime=t;
 }
 return true;
}
