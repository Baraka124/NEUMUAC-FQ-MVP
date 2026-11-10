import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';

export type InvitationKind='clinician'|'guest';
export type InvitationDelivery='dispatching'|'sent'|'failed'|'uncertain';
export interface InvitationRecord{
 readonly id:string;
 readonly email:string;
 readonly kind:InvitationKind;
 readonly status:InvitationDelivery;
 readonly createdAt:string;
 readonly updatedAt:string;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const emailFormat=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export function normalizedInviteAddress(raw:string):string|null{
 const email=raw.trim().toLowerCase();
 return email.length>=6&&email.length<=254&&!email.includes('..')&&emailFormat.test(email)?email:null;
}
export function parseInvitationRecords(value:unknown):InvitationRecord[]{
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid invitation history.');
 const obj=value as Record<string,unknown>;
 if(obj.status!=='ready'||!Array.isArray(obj.invitations)||obj.invitations.length>30)throw Error('Invalid invitation history.');
 return obj.invitations.map((item:unknown)=>{
  if(!item||typeof item!=='object'||Array.isArray(item))throw Error('Invalid invitation history entry.');
  const row=item as Record<string,unknown>;
  if(typeof row.id!=='string'||!uuid.test(row.id)||
   typeof row.email!=='string'||normalizedInviteAddress(row.email)!==row.email||
   (row.kind!=='clinician'&&row.kind!=='guest')||
   !['dispatching','sent','failed','uncertain'].includes(String(row.status))||
   typeof row.createdAt!=='string'||!Number.isFinite(Date.parse(row.createdAt))||
   typeof row.updatedAt!=='string'||!Number.isFinite(Date.parse(row.updatedAt)))
   throw Error('Invalid invitation history entry.');
  return {id:row.id,email:row.email,kind:row.kind,status:row.status as InvitationDelivery,
   createdAt:row.createdAt,updatedAt:row.updatedAt};
 });
}
export class InvitationOperationError extends Error{
 constructor(readonly status:number,readonly uncertain:boolean,message:string){
  super(message);this.name='InvitationOperationError';
 }
}
export function createAdminInvitationClient(
 config:ReadOnlyConfig,
 session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 async function authorizedFetch(method:'GET'|'POST',body?:object,signal?:AbortSignal):Promise<Response>{
  const subject=session.state.userId;
  if(session.state.phase!=='signed-in'||!subject)throw new InvitationOperationError(401,false,'Administrator session required.');
  const token=await session.getAccessToken();
  if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
   throw new InvitationOperationError(401,false,'Session changed before the invitation request.');
  const url=new URL('/functions/v1/nfq-admin-invite',endpoint);
  const response=await transport(url.toString(),{
   method,cache:'no-store',credentials:'omit',redirect:'error',signal,
   headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,Accept:'application/json',...(method==='POST'?{'Content-Type':'application/json'}:{})},
   ...(method==='POST'?{body:JSON.stringify(body)}:{})
  });
  if(session.state.phase!=='signed-in'||session.state.userId!==subject)
   throw new InvitationOperationError(401,method==='POST','Session changed while checking invitation status.');
  return response;
 }
 return {
  async list(signal?:AbortSignal):Promise<InvitationRecord[]>{
   const response=await authorizedFetch('GET',undefined,signal);
   if(!response.ok)throw new InvitationOperationError(response.status,false,response.status===503?'Invitation service is not enabled.':'Invitation history could not be verified.');
   return parseInvitationRecords(await response.json());
  },
  async send(address:string,kind:InvitationKind):Promise<void>{
   const email=normalizedInviteAddress(address);
   if(!email||(kind!=='clinician'&&kind!=='guest'))
    throw new InvitationOperationError(400,false,'Enter a valid recipient email and invitation type.');
   let response:Response;
   try{response=await authorizedFetch('POST',{email,kind});}
   catch(error){
    if(error instanceof InvitationOperationError)throw error;
    throw new InvitationOperationError(0,true,'Delivery could not be confirmed. Check invitation history before any retry.');
   }
   if(response.status===202){
    const body:unknown=await response.json().catch(()=>null);
    if(!body||typeof body!=='object'||(body as Record<string,unknown>).status!=='invitation-requested')
     throw new InvitationOperationError(0,true,'Delivery response was incomplete. Check invitation history.');
    return;
   }
   if(response.status===403||response.status===401)
    throw new InvitationOperationError(response.status,false,'Administrator permission was not confirmed.');
   if(response.status===503)
    throw new InvitationOperationError(503,true,'Invitation service is unavailable. Do not repeat the request without checking history.');
   throw new InvitationOperationError(response.status,response.status===409||response.status===422,
    response.status===409?'An invitation is already pending, or the request could not be reserved. Check invitation history.':
    'Delivery could not be confirmed. The address may already be registered. Check the account directory and invitation history.');
  }
 };
}
