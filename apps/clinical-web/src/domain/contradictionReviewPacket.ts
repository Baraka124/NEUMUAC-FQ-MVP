import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {recordedConflictFocus} from './recordedConflictFocus';
import {recordedResearchChronology} from './recordedResearchChronology';
/**
 * A read-only snapshot for later authorized human adjudication.
 * A variant-linked publication is NOT an assertion that it supports any
 * particular conflict; no clinical decision or approval is generated.
 */
export function prepareUnresolvedConflictPacket(
 variantId:string,history:ResearchHistory,
 references:readonly LiveEvidenceReference[],referencesReadComplete:boolean
):string|null{
 if(!referencesReadComplete||references.length>200||
    references.some(ref=>ref.variantId!==variantId||
      !Number.isSafeInteger(ref.id)||ref.id<=0))return null;
 const focus=recordedConflictFocus(history,variantId);
 const chrono=recordedResearchChronology(history,variantId);
 if(!focus||!chrono||!focus.unresolved.length)return null;
 const safe=(text:string)=>text.replace(/[\r\n]/g,' ').replace(/\\/g,'\\\\')
   .replace(/([\`*_{}\[\]<>|#])/g,'\\$1').slice(0,500);
 const date=(raw:string|null)=>raw||'Not recorded';
 const unresolvedById=new Map(history.conflicts.map(c=>[c.id,c]));
 const lines=[
  '# neumuacFQ | Recorded contradiction review packet',
  '',
  '**Status:** Read-only research preparation; NOT adjudicated or submitted',
  '**Variant record ID:** '+variantId,
  '**Current unresolved contradictions:** '+focus.unresolved.length,
  '**Total recorded contradictions:** '+focus.totalConflicts,
  '**Recorded validations:** '+history.validations.length,
  '',
  '## Unresolved recorded contradictions',
  ...focus.unresolved.flatMap((entry,index)=>{
   const source=unresolvedById.get(entry.id);
   return [
    (index+1)+'. Conflict record #'+entry.id+' · '+safe(entry.field),
    '   - Recorded severity: '+safe(entry.recordedSeverity||'Not recorded'),
    '   - Detection timestamp: '+date(source?.detectedAt??null),
    '   - Status: unresolved (recorded; not independently verified)'
   ];
  }),
  '',
  '## Variant-linked source catalogue ('+references.length+' records)',
  '**Warning:** These are general links assigned to the variant, NOT verified supporting evidence for a specific contradiction.',
  ...(references.length?references.map((ref,index)=>
    (index+1)+'. '+safe(ref.title)+' · Reference #'+ref.id+' · '+
     ref.url+' · DOI '+safe(ref.doi||'Not recorded')+' · PMID '+safe(ref.pmid||'Not recorded')
  ):['No reference links were returned in the successfully loaded available register.']),
  '',
  '## Open review requirements',
  '- Verify underlying scientific record and the exact field-level disagreement before interpreting any conflict.',
  '- Identify independent supporting sources and distinguish contradictory evidence from different source scopes.',
  '- A server-authorized reviewer must record decision, revision, rationale and audit event atomically.',
  '- No reviewer assignment, claim, approval or resolution has been performed.',
  '- No patient information or private clinician notes included.'
 ];
 return lines.join('\n');
}
