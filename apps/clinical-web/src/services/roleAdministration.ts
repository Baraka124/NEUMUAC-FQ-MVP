import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';
import type {ResearchRoleState,ResearchRole} from './researchRole';

export type AssignableRole=ResearchRole;
export class RoleAdministrationError extends Error{
 constructor(public readonly kind:'invalid'|'not-authorized'|'uncertain',message:string){
  super(message);this.name='RoleAdministrationError';
 }
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function canManageResearchRoles(phase:string,role:Pick<ResearchRoleState,'phase'|'role'>):boolean{
 return phase==='signed-in'&&role.phase==='verified'&&role.role==='administrator';
}
export function validateRoleAssignment(target:string,role:string,revoke:boolean,actor:string):boolean{
 return uuid.test(target)&&uuid.test(actor)&&
  (role==='contributor'||role==='reviewer'||role==='administrator')&&
  !(target.toLowerCase()===actor.toLowerCase()&&(revoke||role!=='administrator'));
}
/** Requires server-verified administrator membership; a browser role badge is never sufficient. */
export function createRoleAdministrationClient(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async setRole(target:string,role:AssignableRole,revoke:boolean):Promise<void>{
   const actor=session.state.userId;
   if(session.state.phase!=='signed-in'||!actor)
    throw new RoleAdministrationError('not-authorized','Sign in with an assigned administrator account.');
   if(!validateRoleAssignment(target,role,revoke,actor))
    throw new RoleAdministrationError('invalid','Enter a valid account UUID and research role. Administrators cannot revoke their own access.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==actor)
    throw new RoleAdministrationError('not-authorized','Administrator session changed. The operation was not sent.');
   const url=new URL('/rest/v1/rpc/nfq_admin_set_member_role',endpoint);
   let response:Response;
   try{
    response=await transport(url.toString(),{
     method:'POST',credentials:'omit',cache:'no-store',redirect:'error',
     headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      'Content-Type':'application/json',Accept:'application/json'},
     body:JSON.stringify({target_user_id:target.toLowerCase(),new_role:role,revoke_access:revoke})
    });
   }catch{
    throw new RoleAdministrationError('uncertain','The server result is uncertain. Verify the account membership before retrying.');
   }
   if(session.state.phase!=='signed-in'||session.state.userId!==actor)
    throw new RoleAdministrationError('uncertain','The administrator account changed during the request. Verify permissions.');
   if(response.status===401||response.status===403)
    throw new RoleAdministrationError('not-authorized','The server denied research permission management.');
   if(!response.ok)
    throw new RoleAdministrationError('uncertain','The server did not confirm the role change. Verify membership before retrying.');
   if(response.status!==204){
    let body:string;
    try{body=await response.text();}
    catch{throw new RoleAdministrationError('uncertain','Role response could not be verified.');}
    if(body!==''&&body!=='null')
     throw new RoleAdministrationError('uncertain','Unexpected server response. Verify membership.');
   }
  }
 };
}
