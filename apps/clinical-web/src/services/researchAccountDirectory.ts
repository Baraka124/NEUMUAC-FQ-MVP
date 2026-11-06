import {validateReadOnlyConfig,type ReadOnlyConfig} from './liveVariants';
import type {AuthController} from './authSession';

export interface ResearchAccountRow{
 userId:string;
 email:string;
 createdAt:string;
 emailConfirmed:boolean;
 role:'contributor'|'reviewer'|'administrator'|null;
 revoked:boolean;
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function parseResearchAccountRows(input:unknown):ResearchAccountRow[]{
 if(!Array.isArray(input)||input.length>100)throw Error('Invalid account directory response.');
 return input.map(row=>{
  if(!row||typeof row!=='object'||Array.isArray(row))throw Error('Invalid directory entry.');
  const r=row as Record<string,unknown>;
  if(typeof r.user_id!=='string'||!uuid.test(r.user_id)||
   typeof r.account_email!=='string'||r.account_email.length>320||
   typeof r.account_created_at!=='string'||!Number.isFinite(Date.parse(r.account_created_at))||
   typeof r.email_confirmed!=='boolean'||
   (r.research_role!==null&&!['contributor','reviewer','administrator'].includes(String(r.research_role)))||
   (r.role_revoked_at!==null&&typeof r.role_revoked_at!=='string'))
    throw Error('Invalid directory entry.');
  return {userId:r.user_id,email:r.account_email,createdAt:r.account_created_at,
   emailConfirmed:r.email_confirmed,role:r.research_role as ResearchAccountRow['role'],
   revoked:r.role_revoked_at!==null};
 });
}
export function createResearchAccountDirectory(
 config:ReadOnlyConfig,session:Pick<AuthController,'state'|'getAccessToken'>,
 transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return {
  async list(search:string,signal?:AbortSignal):Promise<ResearchAccountRow[]>{
   const subject=session.state.userId;
   if(session.state.phase!=='signed-in'||!subject)throw Error('Administrator sign-in required.');
   const token=await session.getAccessToken();
   if(!token||session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed before reading account directory.');
   const url=new URL('/rest/v1/rpc/nfq_admin_list_research_accounts',endpoint);
   const response=await transport(url.toString(),{
    method:'POST',credentials:'omit',redirect:'error',cache:'no-store',signal,
    headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     Accept:'application/json','Content-Type':'application/json'},
    body:JSON.stringify({p_search:search.trim().slice(0,120),p_limit:50})
   });
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed while reading account directory.');
   if(!response.ok)throw Error('The server did not authorise or return the account directory.');
   const rows=parseResearchAccountRows(await response.json());
   if(session.state.phase!=='signed-in'||session.state.userId!==subject)
    throw Error('Session changed after directory response.');
   return rows;
  }
 };
}
