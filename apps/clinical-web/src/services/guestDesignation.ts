import {reactive,readonly,watch} from 'vue';
import {authController,type AuthController} from './authSession';
import {readConfigFromEnvironment,validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {GuestPhase} from '../domain/workspacePersona';

export interface GuestDesignationState {phase:GuestPhase}
const state=reactive<GuestDesignationState>({phase:'signed-out'});
export const guestDesignation=readonly(state);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function verifyGuestRows(rows:unknown,subject:string):boolean{
 if(!Array.isArray(rows)||rows.length>1)throw Error('Invalid FQ guest designation.');
 if(!rows.length)return false;
 const row=rows[0];
 if(!row||typeof row!=='object'||Array.isArray(row)||row.user_id!==subject||row.status!=='active')
  throw Error('Invalid FQ guest designation.');
 return true;
}
export function createGuestDesignationClient(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async readOwn(signal?:AbortSignal):Promise<boolean>{
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject||!uuid.test(subject))
    throw Error('Verified session required.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   const url=new URL('/rest/v1/nfq_guest_designations',endpoint);
   url.searchParams.set('select','user_id,status');
   url.searchParams.set('user_id','eq.'+subject);
   url.searchParams.set('limit','2');
   const response=await transport(url.toString(),{
    method:'GET',credentials:'omit',redirect:'error',cache:'no-store',signal,
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'}
   });
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   if(!response.ok)throw Error('Guest designation unavailable.');
   const verified=verifyGuestRows(await response.json(),subject);
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed.');
   return verified;
  }
 };
}
let generation=0;
let inflight:AbortController|null=null;
const controller=authController;
const config=readConfigFromEnvironment();
const client=config&&controller?createGuestDesignationClient(config,controller):null;
export async function refreshGuestDesignation():Promise<void>{
 const run=++generation;
 inflight?.abort();inflight=null;
 state.phase='signed-out';
 if(!controller||controller.state.phase!=='signed-in')return;
 if(!client){state.phase='unavailable';return;}
 const abort=new AbortController();inflight=abort;
 state.phase='checking';
 try{
  const verified=await client.readOwn(abort.signal);
  if(run!==generation||abort.signal.aborted)return;
  state.phase=verified?'verified':'none';
 }catch{
  if(run!==generation||abort.signal.aborted)return;
  state.phase='unavailable';
 }
}
if(controller)watch(()=>[controller.state.phase,controller.state.userId],()=>void refreshGuestDesignation(),{immediate:true});
