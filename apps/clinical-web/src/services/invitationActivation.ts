import {reactive,readonly} from 'vue';
import {authController} from './authSession';
import {readInvitationReturn} from '../domain/invitationReturn';

export type InvitePhase='idle'|'verifying'|'ready'|'error'|'complete';
const state=reactive<{phase:InvitePhase;message:string;purpose:'invite'|'recovery'}>({phase:'idle',message:'',purpose:'invite'});
export const invitationActivation=readonly(state);

export async function consumeInvitationReturn(location:Pick<Location,'hash'|'pathname'|'search'>,
 replaceUrl:(url:string)=>void):Promise<boolean>{
 const result=readInvitationReturn(location.hash);
 if(result.kind==='none')return false;
 // Remove bearer credentials from address bar before any async network request.
 replaceUrl(location.pathname+location.search+'#/activate');
 if(result.kind==='error'||!authController){
  state.phase='error';state.message='Invitation could not be verified. Ask the administrator for a new invitation.';
  return true;
 }
 state.phase='verifying';state.message='';state.purpose=result.kind;
 if(await authController.establishInvitation(result.tokens)){
  state.phase='ready';
 }else{
  state.phase='error';
  state.message=authController.state.message||'Invitation could not be verified.';
 }
 return true;
}
export async function finishInvitation(password:string):Promise<boolean>{
 if(state.phase!=='ready'||!authController)return false;
 const ok=await authController.chooseInvitationPassword(password);
 if(ok){state.phase='complete';state.message='Password saved. Your research account is ready.';}
 else state.message=authController.state.message||'Password could not be saved.';
 return ok;
}
