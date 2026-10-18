import type {LiveEvidenceReference} from '../services/liveEvidence';

export type SourceCorrectionField='title'|'type'|'category'|'journal'|'year'|'doi'|'pmid';
export interface EvidenceContributionInput {
 readonly reference:LiveEvidenceReference;
 readonly field:SourceCorrectionField;
 readonly suggestedValue:string;
 readonly rationale:string;
}
/** Create a PORTABLE LOCAL DOCUMENT only. This is NOT a submitted, validated
 * or authorized review decision, and it never writes to any research table.
 */
export function prepareEvidenceContribution(input:EvidenceContributionInput):string|null{
 const ref=input.reference;
 if(!Number.isSafeInteger(ref.id)||ref.id<=0||!/^[1-9]\d{0,17}$/.test(ref.variantId))return null;
 if(!['title','type','category','journal','year','doi','pmid'].includes(input.field))return null;
 const value=input.suggestedValue.trim(),reason=input.rationale.trim();
 if(!value||value.length>200||/[\u0000-\u001F]/.test(value)||
    reason.length<15||reason.length>900||/[\u0000-\u001F]/.test(reason))return null;
 if(input.field==='year'&&!/^(?:18|19|20)\d{2}$/.test(value))return null;
 if(input.field==='pmid'&&!/^[1-9]\d{0,11}$/.test(value))return null;
 if(input.field==='doi'&&!/^10\.\d{4,9}\/\S{1,160}$/i.test(value))return null;
 const recorded=String(ref[input.field]??'Not recorded').replace(/[\r\n]/g,' ').slice(0,220);
 const escaped=(s:string)=>s.replace(/\\/g,'\\\\').replace(/([\`*_{}\[\]<>|#])/g,'\\$1');
 const lines=[
  '# neumuacFQ | Research source-correction proposal',
  '',
  '**Status:** Unsubmitted local proposal; not a scientific approval',
  '**Recorded variant ID:** '+ref.variantId,
  '**Recorded reference ID:** '+ref.id,
  '**Recorded source:** '+escaped(ref.source),
  '**Recorded reference title:** '+escaped(ref.title),
  '**Recorded source link:** '+ref.url,
  '',
  '## Proposed change',
  '- Field: '+input.field,
  '- Currently recorded: '+escaped(recorded),
  '- Suggested value: '+escaped(value),
  '',
  '## Research rationale',
  escaped(reason),
  '',
  '## Review limitations',
  '- This document is not submitted to neumuacFQ or neumDESK.',
  '- An authorized curator must check the underlying publication, provenance and current catalog value.',
  '- No reviewer identity, verification signature or approval has been assigned.',
  '- Do not include patient identifiers or clinical records.'
 ];
 return lines.join('\n');
}
