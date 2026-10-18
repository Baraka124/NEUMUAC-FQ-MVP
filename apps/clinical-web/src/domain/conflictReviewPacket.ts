import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {recordedConflictFocus} from './recordedConflictFocus';

export function prepareConflictReviewPacket(
 variantId:string,history:ResearchHistory,references:readonly LiveEvidenceReference[],complete:boolean
):string|null{
 const focus=recordedConflictFocus(history,variantId);
 if(!complete||!focus||!focus.unresolved.length||references.length>200||
    references.some(ref=>ref.variantId!==variantId))return null;
 const field=(value:string|null)=>String(value||'Not recorded').replace(/[\r\n]/g,' ').slice(0,300);
 const lines=[
  '# neumuacFQ — Unresolved research contradictions',
  '',
  'Variant record: '+variantId,
  'Status: Research review preparation only; no approval or resolution',
  'Unresolved conflict records: '+focus.unresolved.length,
  '',
  '## Unresolved recorded fields',
  ...focus.unresolved.map(x=>
   '- Conflict #'+x.id+': '+field(x.field)+'; recorded severity: '+field(x.recordedSeverity)),
  '',
  '## Variant-linked references ('+references.length+')',
  'These references have not been independently established as supporting a particular contradiction.',
  ...references.map(x=>'- Record #'+x.id+': '+field(x.title)+'; '+x.url),
  '',
  '## Unresolved verification requirements',
  '- Check the original source and the precise field-level disagreement.',
  '- Obtain independent scientific review and preserve source provenance.',
  '- Record any later decision only through a verified, auditable server workflow.',
  '- This document does not assign reviewers or change research records.'
 ];
 return lines.join('\n');
}
