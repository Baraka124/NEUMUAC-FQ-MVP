import type {ResearchRole,RolePhase} from '../services/researchRole';
export type GuestPhase='signed-out'|'checking'|'verified'|'none'|'unavailable';
export type WorkspacePersona='administrator'|'reviewer'|'researcher'|'guest'|'pending'|'account'|'public';
/** UI classification only: all sensitive actions remain independently authorized by the server. */
export function resolveWorkspacePersona(
 authPhase:string,rolePhase:RolePhase,role:ResearchRole|null,guestPhase:GuestPhase
):WorkspacePersona {
 if(authPhase!=='signed-in')return 'public';
 if(rolePhase==='verified'&&role==='administrator')return 'administrator';
 if(guestPhase==='verified')return 'guest';
 if(rolePhase==='checking'||guestPhase==='checking'||guestPhase==='unavailable'||rolePhase==='unavailable')
  return 'account';
 if(rolePhase==='verified'&&role==='reviewer')return 'reviewer';
 if(rolePhase==='verified'&&role==='contributor')return 'researcher';
 return 'pending';
}
export function workspaceTitle(persona:WorkspacePersona):string {
 switch(persona){
  case 'administrator':return 'Research administration';
  case 'reviewer':return 'Scientific review workspace';
  case 'researcher':return 'My research workspace';
  case 'guest':return 'Guest workspace';
  case 'pending':return 'Account workspace';
  case 'account':return 'Account workspace';
  default:return 'Research access';
 }
}
