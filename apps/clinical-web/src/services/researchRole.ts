import {reactive,readonly,watch} from 'vue';
import {authController} from './authSession';
import {readConfigFromEnvironment} from './liveVariants';

export type ResearchRole='contributor'|'reviewer'|'administrator';
export type RolePhase='signed-out'|'checking'|'unassigned'|'verified'|'unavailable';
export interface ResearchRoleState{phase:RolePhase;role:ResearchRole|null;message:string|null}
const state=reactive<ResearchRoleState>({phase:'signed-out',role:null,message:null});
let generation=0;
export const researcherRole=readonly(state);

/** Fail closed: only one, active, database-returned assignment for the signed-in subject. */
export function verifyMembershipRows(rows:unknown,subject:string):{phase:'verified'|'unassigned'|'unavailable';role:ResearchRole|null}{
 if(!Array.isArray(rows)||rows.length>1)return {phase:'unavailable',role:null};
 if(rows.length===0)return {phase:'unassigned',role:null};
 const value=rows[0];
 if(!value||typeof value!=='object'||Array.isArray(value))return {phase:'unavailable',role:null};
 const row=value as Record<string,unknown>;
 if(row.user_id!==subject||typeof row.revoked_at==='undefined')return {phase:'unavailable',role:null};
 if(row.revoked_at!==null)return {phase:'unassigned',role:null};
 if(row.role!=='contributor'&&row.role!=='reviewer'&&row.role!=='administrator')return {phase:'unavailable',role:null};
 return {phase:'verified',role:row.role};
}

export async function refreshResearcherRole():Promise<void>{
 const run=++generation;
 state.role=null;state.message=null;
 const controller=authController;
 if(!controller||controller.state.phase!=='signed-in'){state.phase='signed-out';return;}
 const subject=controller.state.userId;
 if(!subject){state.phase='unavailable';state.message='The signed-in account identity could not be verified.';return;}
 const cfg=readConfigFromEnvironment();
 if(!cfg){state.phase='unavailable';state.message='Research-role lookup is not configured.';return;}
 state.phase='checking';
 const token=await controller.getAccessToken();
 if(run!==generation||controller.state.userId!==subject)return;
 if(!token){state.phase='signed-out';return;}
 try {
  const url=new URL('/rest/v1/nfq_research_memberships',cfg.endpoint);
  url.search=new URLSearchParams({
   select:'user_id,role,revoked_at',
   user_id:'eq.'+subject,
   limit:'2'
  }).toString();
  const response=await fetch(url.toString(),{
   method:'GET',
   headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'},
   credentials:'omit',cache:'no-store',redirect:'error'
  });
  if(run!==generation||controller.state.userId!==subject)return;
  if(!response.ok){
   state.phase='unavailable';
   state.message=response.status===404?'Research membership records are not available in the configured database.':'The research membership could not be verified by the server.';
   return;
  }
  const checked=verifyMembershipRows(await response.json(),subject);
  if(run!==generation||controller.state.userId!==subject)return;
  state.phase=checked.phase;state.role=checked.role;
  if(checked.phase==='unavailable')state.message='The membership response could not be verified for this account.';
 }catch{
  if(run===generation&&controller.state.userId===subject){
   state.phase='unavailable';state.message='Research-role verification is currently unavailable.';
  }
 }
}
const controller=authController;
if(controller)watch(()=>[controller.state.phase,controller.state.userId] as const,()=>void refreshResearcherRole(),{immediate:true});
