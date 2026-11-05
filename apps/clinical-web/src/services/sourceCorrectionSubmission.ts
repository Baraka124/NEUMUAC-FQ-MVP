import {prepareEvidenceContribution,type EvidenceContributionInput} from '../domain/evidenceContributionDraft';
import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';
import type {ResearchRoleState} from './researchRole';

/** The build-time switch is NOT an authorization check. PostgreSQL RPC verifies roles. */
export function canOfferSourceSubmission(enabled:boolean,authPhase:string,role:Pick<ResearchRoleState,'phase'|'role'>):boolean {
 return enabled && authPhase==='signed-in' && role.phase==='verified' &&
  (role.role==='contributor'||role.role==='reviewer'||role.role==='administrator');
}

export class SourceSubmissionError extends Error {
 constructor(public readonly kind:'invalid'|'not-authorized'|'unavailable'|'uncertain',message:string){
  super(message);this.name='SourceSubmissionError';
 }
}

export function createSourceCorrectionSubmission(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
) {
 const endpoint=validateReadOnlyConfig(config);
 return {
  async submit(input:EvidenceContributionInput):Promise<string>{
   if(!prepareEvidenceContribution(input))
    throw new SourceSubmissionError('invalid','Check the proposed value and research rationale.');
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject)
    throw new SourceSubmissionError('not-authorized','Sign in with an assigned research account.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceSubmissionError('not-authorized','The research session is no longer valid.');
   const url=new URL('/rest/v1/rpc/nfq_submit_source_correction',endpoint);
   let response:Response;
   try{
    response=await transport(url.toString(),{
     method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
     headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({
      p_reference_id:input.reference.id,p_field_name:input.field,
      p_proposed_value:input.suggestedValue.trim(),p_rationale:input.rationale.trim()
     })
    });
   }catch{
    // A write may have committed before the network failed: never retry automatically.
    throw new SourceSubmissionError('uncertain','Submission could not be confirmed. Check the review queue before trying again.');
   }
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceSubmissionError('uncertain','The account changed while submitting. Verify the proposal status before another submission.');
   if(response.status===401||response.status===403)
    throw new SourceSubmissionError('not-authorized','The server did not authorize this research submission.');
   if(!response.ok)
    throw new SourceSubmissionError('unavailable','The submission was not confirmed by the server. Check the review queue before retrying.');
   let payload:unknown;
   try{payload=await response.json();}
   catch{throw new SourceSubmissionError('uncertain','The server response could not be verified. Check the review queue before retrying.');}
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new SourceSubmissionError('uncertain','The account changed during submission. Verify the proposal status.');
   // Supabase serializes bigint RPC return values as JSON number (or a string).
   if(!((typeof payload==='number'&&Number.isSafeInteger(payload)&&payload>0)||
        (typeof payload==='string'&&/^[1-9]\d{0,17}$/.test(payload))))
    throw new SourceSubmissionError('uncertain','The proposal identifier could not be verified. Check the review queue before retrying.');
   return String(payload);
  }
 };
}
