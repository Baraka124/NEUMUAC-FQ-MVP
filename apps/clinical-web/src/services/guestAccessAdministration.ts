import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';

export interface GuestAccessState {
 readonly active:boolean;
 readonly reason:string|null;
 readonly designatedAt:string|null;
}
export type GuestAccessAction='grant'|'revoke';
export class GuestAccessError extends Error {
 constructor(readonly kind:'invalid'|'denied'|'uncertain',message:string){super(message);this.name='GuestAccessError';}
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validGuestAccessAction(target:string,action:string,reason:string,actor:string):boolean{
 return uuid.test(target)&&uuid.test(actor)&&target.toLowerCase()!==actor.toLowerCase()&&
 (action==='grant'||action==='revoke')&&reason.trim().length>=8&&reason.trim().length<=160;
}
export function parseGuestAccess(input:unknown):GuestAccessState {
 if(!Array.isArray(input)||input.length!==1||typeof input[0]!=='object'||input[0]===null)
  throw new GuestAccessError('uncertain','Guest designation response was not verifiable.');
 const row=input[0] as Record<string,unknown>;
 if(typeof row.is_active!=='boolean'||
  (row.designation_reason!==null&&typeof row.designation_reason!=='string')||
  (row.designated_at!==null&&typeof row.designated_at!=='string'))
  throw new GuestAccessError('uncertain','Guest designation response was incomplete.');
 return {active:row.is_active,reason:row.designation_reason as string|null,
  designatedAt:row.designated_at as string|null};
}
export function createGuestAccessAdminClient(
 config:ReadOnlyConfig,session:Pick<AuthController,'state'|'getAccessToken'>,transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 async function rpc(name:string,payload:object,kind:'read'|'mutate',signal?:AbortSignal){
  const actor=session.state.userId;
  if(session.state.phase!=='signed-in'||!actor)throw new GuestAccessError('denied','Administrator session required.');
  const token=await session.getAccessToken();
  if(!token||session.state.phase!=='signed-in'||session.state.userId!==actor)
   throw new GuestAccessError('denied','Administrator session changed.');
  const url=new URL('/rest/v1/rpc/'+name,endpoint);
  let res:Response;
  try{
   res=await transport(url.toString(),{
    method:'POST',credentials:'omit',cache:'no-store',redirect:'error',signal,
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify(payload)
   });
  }catch{throw new GuestAccessError('uncertain','Server operation could not be confirmed. Recheck status before retrying.');}
  if(session.state.phase!=='signed-in'||session.state.userId!==actor)
   throw new GuestAccessError('uncertain','Account changed during operation. Recheck designation.');
  if(res.status===401||res.status===403)
   throw new GuestAccessError('denied','The server denied Guest access administration.');
  if(!res.ok)
   throw new GuestAccessError(kind==='read'?'denied':'uncertain',
    kind==='read'?'Guest access could not be checked.':'The server did not confirm the change. Check account status.');
  return res;
 }
 return {
  async read(target:string,signal?:AbortSignal):Promise<GuestAccessState>{
   if(!uuid.test(target))throw new GuestAccessError('invalid','Select a valid account.');
   const response=await rpc('nfq_admin_get_guest_access',{p_user_id:target},'read',signal);
   return parseGuestAccess(await response.json());
  },
  async set(target:string,action:GuestAccessAction,reason:string):Promise<void>{
   const actor=session.state.userId||'';
   if(!validGuestAccessAction(target,action,reason,actor))
    throw new GuestAccessError('invalid','Choose an eligible account and enter an 8–160-character reason.');
   const response=await rpc('nfq_admin_set_guest_access',
    {p_user_id:target,p_action:action,p_reason:reason.trim()},'mutate');
   if(response.status!==204){
    const body=await response.text().catch(()=>'?');
    if(body!==''&&body!=='null')
     throw new GuestAccessError('uncertain','Unexpected response after change. Verify current designation.');
   }
  }
 };
}
