import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import {verifyMembershipRows,type ResearchRole} from './researchRole';
import type {AuthController} from './authSession';

export type ResearchAccessDiagnostic=Readonly<{
 subject:string;role:ResearchRole|null;membership:'verified'|'unassigned';
 proposalVisibility:'checked';privateProposalCount:number;
}>;
export class ResearchAccessDiagnosticError extends Error{
 constructor(public readonly kind:'session'|'denied'|'unavailable'|'invalid',message:string){
  super(message);this.name='ResearchAccessDiagnosticError';
 }
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const positiveId=/^[1-9][0-9]{0,17}$/;
function safeId(value:unknown):boolean{
 return (typeof value==='string'&&positiveId.test(value))||
  (typeof value==='number'&&Number.isSafeInteger(value)&&value>0);
}
/** Explicit user action only: all requests are GET, never writes or role changes. */
export function createResearchAccessDiagnostic(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async check(signal?:AbortSignal):Promise<ResearchAccessDiagnostic>{
   const subject=session.state.userId;
   if(signal?.aborted||session.state.phase!=='signed-in'||!subject||!uuid.test(subject))
    throw new ResearchAccessDiagnosticError('session','A verified signed-in account is required.');
   const token=await session.getAccessToken();
   if(!token||signal?.aborted||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new ResearchAccessDiagnosticError('session','The research session could not be verified.');
   const headers={apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'};
   const read=async(url:URL):Promise<unknown>=>{
    let response:Response;
    try{
     response=await transport(url.toString(),{
      method:'GET',headers,credentials:'omit',cache:'no-store',redirect:'error',signal
     });
    }catch{
     throw new ResearchAccessDiagnosticError('unavailable','The server-access check could not be completed.');
    }
    if(signal?.aborted||session.state.phase!=='signed-in'||session.state.userId!==subject)
     throw new ResearchAccessDiagnosticError('session','The account changed during verification.');
    if(response.status===401||response.status===403)
     throw new ResearchAccessDiagnosticError('denied','The server denied the access-verification request.');
    if(!response.ok)
     throw new ResearchAccessDiagnosticError('unavailable','The server-access check was not available.');
    try{return await response.json();}
    catch{throw new ResearchAccessDiagnosticError('invalid','The server returned an invalid verification response.');}
   };
   const identity=await read(new URL('/auth/v1/user',endpoint));
   if(!identity||typeof identity!=='object'||Array.isArray(identity)||
    (identity as Record<string,unknown>).id!==subject)
    throw new ResearchAccessDiagnosticError('invalid','The authenticated server identity does not match this account.');
   const membersUrl=new URL('/rest/v1/nfq_research_memberships',endpoint);
   membersUrl.search=new URLSearchParams({
    select:'user_id,role,revoked_at',user_id:'eq.'+subject,limit:'2'
   }).toString();
   const checked=verifyMembershipRows(await read(membersUrl),subject);
   if(checked.phase==='unavailable')
    throw new ResearchAccessDiagnosticError('invalid','Membership records could not be independently verified.');
   const proposalsUrl=new URL('/rest/v1/nfq_source_correction_proposals',endpoint);
   proposalsUrl.search=new URLSearchParams({
    select:'id,created_by',order:'id.asc',limit:'21'
   }).toString();
   const proposals=await read(proposalsUrl);
   if(!Array.isArray(proposals)||proposals.length>20)
    throw new ResearchAccessDiagnosticError('invalid','Proposal visibility response could not be verified.');
   for(const row of proposals){
    if(!row||typeof row!=='object'||Array.isArray(row)||
     !safeId((row as Record<string,unknown>).id)||
     typeof (row as Record<string,unknown>).created_by!=='string'||
     !uuid.test((row as Record<string,unknown>).created_by as string))
     throw new ResearchAccessDiagnosticError('invalid','The server returned invalid proposal metadata.');
    if(checked.role!=='administrator'&&checked.role!=='reviewer'&&
     (row as Record<string,unknown>).created_by!==subject)
     throw new ResearchAccessDiagnosticError('invalid','The server exposed a proposal owned by another account.');
   }
   if(checked.phase==='unassigned'&&proposals.length!==0)
    throw new ResearchAccessDiagnosticError('invalid','An unassigned account received private proposals.');
   if(signal?.aborted||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw new ResearchAccessDiagnosticError('session','The account changed before verification completed.');
   return Object.freeze({
    subject,role:checked.role,membership:checked.phase,
    proposalVisibility:'checked',privateProposalCount:proposals.length
   });
  }
 };
}
