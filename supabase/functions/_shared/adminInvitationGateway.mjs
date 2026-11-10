// FQ-only account invitation policy; no credentials or role grants exposed to browsers.
const ADDRESS=/^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
export function normalizeInvitation(input,actorEmail=''){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const keys=Object.keys(input);
 if(keys.length!==2||!keys.includes('email')||!keys.includes('kind'))return null;
 if(typeof input.email!=='string'||typeof input.kind!=='string')return null;
 const email=input.email.trim().toLowerCase();
 if(email.length>254||email.length<6||!ADDRESS.test(email)||email.includes('..'))return null;
 if(email===actorEmail.trim().toLowerCase())return null;
 if(!['clinician','guest'].includes(input.kind))return null;
 return {email,kind:input.kind};
}
export function safeInviteOrigin(origin,allowedOrigin='https://fq.neumact.org'){
 return typeof origin==='string'&&origin===allowedOrigin;
}
function respond(status,payload,origin){
 return new Response(JSON.stringify(payload),{status,headers:{
  'Content-Type':'application/json','Cache-Control':'no-store',
  'Access-Control-Allow-Origin':origin,'Vary':'Origin',
  'Access-Control-Allow-Headers':'authorization,apikey,content-type',
  'Access-Control-Allow-Methods':'POST,OPTIONS'
 }});
}
/**
 * Pure, dependency-injected gateway. Only a verified, active FQ Administrator
 * may initiate an emailed Supabase invitation. Provider responses NEVER return
 * magic links, bearer tokens, account existence or temporary credentials.
 * Audit reservation precedes email delivery; no automatic retry after uncertainty.
 */
export function createInvitationGateway({
 enabled=false,allowedOrigin='https://fq.neumact.org',
 verifyAdministrator,recordDispatch,sendInvitation,markStatus
}){
 return async function handle(req){
  const origin=req.headers.get('Origin')||'';
  if(!safeInviteOrigin(origin,allowedOrigin))
   return new Response('',{status:403,headers:{'Cache-Control':'no-store'}});
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type','Access-Control-Allow-Methods':'POST,OPTIONS','Vary':'Origin'}});
  if(req.method!=='POST')return respond(405,{error:'Method not permitted'},origin);
  if(!enabled)return respond(503,{error:'Invitations are not enabled'},origin);
  const token=req.headers.get('Authorization')?.match(/^Bearer\s+([^\s]+)$/i)?.[1];
  if(!token)return respond(401,{error:'Administrator sign-in required'},origin);
  let actor;
  try{actor=await verifyAdministrator(token)}
  catch{return respond(503,{error:'Administrator identity could not be verified'},origin)}
  if(!actor||typeof actor.id!=='string'||typeof actor.email!=='string')
   return respond(403,{error:'Administrator access required'},origin);
  let input;
  try{
   const body=await req.text();
   if(body.length>1024)return respond(400,{error:'Invalid invitation request'},origin);
   input=normalizeInvitation(JSON.parse(body),actor.email);
  }catch{return respond(400,{error:'Invalid invitation request'},origin)}
  if(!input)return respond(400,{error:'Invalid invitation request'},origin);
  let auditId;
  try{auditId=await recordDispatch({...input,actorId:actor.id});}
  catch{return respond(409,{error:'Invitation is already pending or could not be reserved. Check invitation history.'},origin)}
  if(!auditId)return respond(503,{error:'Invitation could not be recorded'},origin);
  let recipientId=null,dispatchFailed=false;
  try{recipientId=await sendInvitation(input.email,input.kind)}
  catch{dispatchFailed=true}
  try{await markStatus(auditId,dispatchFailed?'failed':'sent',recipientId)}
  catch{
   // The invitation may already have been sent. Never automatically retry.
   return respond(503,{error:'Delivery state could not be confirmed. Verify invitation history before retrying.'},origin);
  }
  if(dispatchFailed)return respond(422,{error:'Invitation delivery was not confirmed. The account may already exist or the email provider may be unavailable.'},origin);
  return respond(202,{status:'invitation-requested',message:'An invitation has been requested. Research privileges are not granted by an invitation.'},origin);
 };
}
