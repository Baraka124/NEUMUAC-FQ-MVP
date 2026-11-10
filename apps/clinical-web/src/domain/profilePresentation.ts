import type {ProfessionalProfile} from '../services/professionalProfile';
import type {WorkspacePersona} from './workspacePersona';

export type ProfessionalPhase='idle'|'checking'|'ready'|'unlinked'|'unavailable';

/** Presentation only. Never infer an institution or privilege from an email or display name. */
export function verifiedProfileName(profile:ProfessionalProfile|null,phase:ProfessionalPhase,persona:WorkspacePersona):string{
 if(phase==='ready'&&profile)return profile.name;
 return persona==='guest'?'Guest research account':'Research account';
}
export function profileMonogram(profile:ProfessionalProfile|null,phase:ProfessionalPhase):string{
 if(phase!=='ready'||!profile)return 'FQ';
 return profile.name.trim().split(/\s+/u).slice(0,2)
  .map(part=>Array.from(part)[0]?.toLocaleUpperCase()||'').join('').slice(0,3)||'FQ';
}
export function visibleWorkspaceRole(persona:WorkspacePersona,roleLabel:string):string{
 switch(persona){
  case 'administrator':return 'Administrator';
  case 'reviewer':return 'Scientific reviewer';
  case 'researcher':return 'Research contributor';
  case 'guest':return 'External guest';
  case 'account':return 'Verifying access';
  case 'pending':return 'Awaiting assignment';
  default:return roleLabel;
 }
}
