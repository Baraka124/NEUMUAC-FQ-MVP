import {reactive,readonly,watch} from 'vue';
import {authController} from './authSession';
import {readConfigFromEnvironment} from './liveVariants';
export type ResearchRole='contributor'|'reviewer'|'administrator';
export type RolePhase='signed-out'|'checking'|'unassigned'|'verified'|'unavailable';
export interface ResearchRoleState{phase:RolePhase;role:ResearchRole|null;message:string|null}
const state=reactive<ResearchRoleState>({phase:'signed-out',role:null,message:null});
let generation=0;
export const researcherRole=readonly(state);
export async function refreshResearcherRole():Promise<void>{
 const run=++generation;
 state.role=null;state.message=null;
 if(!authController||authController.state.phase!=='signed-in'){state.phase='signed-out';return;}
 const cfg=readConfigFromEnvironment();
 if(!cfg){state.phase='unavailable';state.message='Research role lookup is not configured.';return;}
 state.phase='checking';
 const token=await authController.getAccessToken();
 if(run!==generation)return;
 if(!token){state.phase='signed-out';return;}
 try {
   const url=new URL('/rest/v1/nfq_research_memberships',cfg.endpoint);
   url.search=new URLSearchParams({select:'role,revoked_at',limit:'2'}).toString();
   const response=await fetch(url.toString(),{
     method:'GET',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'},
     credentials:'omit',cache:'no-store',redirect:'error'
   });
   if(run!==generation)return;
   if(!response.ok){state.phase='unavailable';state.message='Research-role verification is unavailable.';return;}
   const rows:unknown=await response.json();
   if(!Array.isArray(rows)||rows.length>1){state.phase='unavailable';state.message='Research-role response could not be verified.';return;}
   if(rows.length===0){state.phase='unassigned';return;}
   const row=rows[0];
   if(!row||typeof row!=='object'||Array.isArray(row)){state.phase='unavailable';return;}
   const value=row as Record<string,unknown>;
   if(value.revoked_at!==null){state.phase='unassigned';return;}
   if(value.role!=='contributor'&&value.role!=='reviewer'&&value.role!=='administrator'){state.phase='unavailable';return;}
   state.role=value.role;state.phase='verified';
 }catch{if(run===generation){state.phase='unavailable';state.message='Research-role verification is unavailable.';}}
}
const controller = authController;
if(controller)watch(()=>controller.state.phase,()=>void refreshResearcherRole(),{immediate:true});
