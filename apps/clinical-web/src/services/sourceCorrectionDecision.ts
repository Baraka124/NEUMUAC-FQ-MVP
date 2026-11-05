import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';
import type {ResearchRoleState} from './researchRole';
import type {SourceCorrectionReviewItem} from './sourceCorrectionReviewQueue';

export type SourceCorrectionDecision='accepted'|'rejected';
export class SourceDecisionError extends Error{
 constructor(public readonly kind:'invalid'|'not-authorized'|'unavailable'|'uncertain',message:string){
  super(message);this.name='SourceDecisionError';
 }
}
/** UI affordance only; the server RPC must still independently authorize every decision. */
export function canDecideSourceCorrection(
 enabled:boolean,authPhase:string,role:Pick<ResearchRoleState,'phase'|'role'>
):boolean{
 return enabled&&authPhase==='signed-in'&&role.phase==='verified'&&
  (role.role==='reviewer'||role.role==='administrator');
}

const positive=/^[1-9][0-9]{0,17}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateSourceDecision(
 proposal:SourceCorrectionReviewItem,decision:SourceCorrectionDecision,note:string,reviewer:string
):boolean{
 const rationale=note.trim();
 return positive.test(proposal.id)&&uuid.test(proposal.createdBy)&&uuid.test(reviewer)&&
  proposal.createdBy.toLowerCase()!==reviewer.toLowerCase()&&
  (decision==='accepted'||decision==='rejected')&&
  rationale.length>=15&&rationale.length<=900&&!/[\u0000-\u001f]/.test(rationale);
}

export function createSourceCorrectionDecisionClient(
 config:ReadOnlyConfig,session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async decide(proposal:SourceCorrectionReviewItem,decision:SourceCorrectionDecision,note:string):Promise<void>{
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject)
    throw new SourceDecisionError('not-authorized','An authenticated reviewer is required.');
   if(!validateSourceDecision(proposal,decision,note,subject))
    throw new SourceDecisionError('invalid','A different reviewer and a rationale of 15–900 characters are required.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceDecisionError('not-authorized','The reviewer session is no longer valid.');
   const url=new URL('/rest/v1/rpc/nfq_review_source_correction',endpoint);
   let response:Response;
   try{
    response=await transport(url.toString(),{
     method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
     headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({
      p_proposal_id:proposal.id,p_decision:decision,p_review_note:note.trim()
     })
    });
   }catch{
    throw new SourceDecisionError('uncertain','The decision result is uncertain. Reload the queue before taking another action.');
   }
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceDecisionError('uncertain','The account changed during review. Reload the queue before continuing.');
   if(response.status===401||response.status===403)
    throw new SourceDecisionError('not-authorized','The server denied scientific review access.');
   if(!response.ok)
    throw new SourceDecisionError('uncertain','The server did not confirm the decision. Reload the queue before trying again.');
   // A PostgreSQL VOID-returning RPC has no decision payload. No scientific publication is implied.
   if(response.status!==204){
    let body:string;
    try{body=await response.text();}
    catch{throw new SourceDecisionError('uncertain','The response could not be verified. Reload the queue.');}
    if(body!==''&&body!=='null')
     throw new SourceDecisionError('uncertain','Unexpected review response. Reload the queue.');
   }
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceDecisionError('uncertain','The reviewer account changed. Reload the queue.');
  }
 };
}
