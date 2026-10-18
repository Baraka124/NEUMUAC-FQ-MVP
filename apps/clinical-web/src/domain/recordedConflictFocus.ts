import type {ResearchHistory} from '../services/liveResearchHistory';
import {recordedResearchChronology} from './recordedResearchChronology';

/** Only source-recorded unresolved contradictions, never a Helios assignment,
 * clinical severity judgement, attestation or permission to adjudicate.
 * Invalid/incomplete records fail closed instead of reporting no conflicts.
 */
export interface UnresolvedConflictFocus {
 readonly totalConflicts:number;
 readonly unresolved:readonly {readonly id:number;readonly field:string;readonly recordedSeverity:string|null}[];
 readonly resolvedCount:number;
}
export function recordedConflictFocus(history:ResearchHistory,id:string):UnresolvedConflictFocus|null{
 if(recordedResearchChronology(history,id)===null)return null;
 const unresolved=history.conflicts
  .filter(item=>!item.resolved)
  .sort((a,b)=>b.id-a.id)
  .map(item=>({id:item.id,field:item.field,recordedSeverity:item.severity}));
 return Object.freeze({
  totalConflicts:history.conflicts.length,
  unresolved:Object.freeze(unresolved),
  resolvedCount:history.conflicts.length-unresolved.length
 });
}
