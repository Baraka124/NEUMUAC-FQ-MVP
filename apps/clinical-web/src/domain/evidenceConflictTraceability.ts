import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {recordedConflictFocus} from './recordedConflictFocus';

/** Ephemeral research worksheet, NOT a persisted, signed or adjudicated evidence link.
 * The existing variant-level evidence register contains no validated
 * contradiction-to-reference relationship. Only an explicit user action can
 * propose a local mapping; the source itself remains unverified.
 */
export type ProvisionalRelation='possible-corroboration'|'possible-disagreement'|'context-only'|'undetermined';
export interface EvidenceConflictTraceInput {
 readonly conflictId:number;
 readonly referenceId:number;
 readonly relation:ProvisionalRelation;
 readonly question:string;
 readonly locator:string;
 readonly interpretation:string;
}
export interface EvidenceConflictTraceEntry extends EvidenceConflictTraceInput {
 readonly variantId:string;
}
const canonical=/^[1-9][0-9]{0,17}$/;
const relationLabels:Readonly<Record<ProvisionalRelation,string>>=Object.freeze({
 'possible-corroboration':'Possible corroboration — not verified',
 'possible-disagreement':'Possible disagreement — not verified',
 'context-only':'Contextual source — not established as evidence',
 'undetermined':'Relationship undetermined — needs review'
});
export const traceRelationOptions=Object.freeze(Object.entries(relationLabels).map(([value,label])=>Object.freeze({
 value:value as ProvisionalRelation,label
})));
const approvedHosts=new Set(['pubmed.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov','scholar.google.com',
 'cftr2.org','www.cftr2.org','doi.org']);
function safeSource(ref:LiveEvidenceReference,variantId:string):boolean{
 if(ref.variantId!==variantId||!Number.isSafeInteger(ref.id)||ref.id<=0||
    !ref.title.trim())return false;
 try{
  const url=new URL(ref.url);
  return url.protocol==='https:'&&approvedHosts.has(url.hostname)&&!url.username&&!url.password&&!url.port;
 }catch{return false;}
}
function clean(value:unknown,min:number,max:number):string|null{
 if(typeof value!=='string')return null;
 const trimmed=value.trim();
 if(trimmed.length<min||trimmed.length>max||/[\u0000-\u001f\u007f\u2028\u2029]/.test(trimmed))return null;
 return trimmed;
}
function validContext(
 variantId:string,history:ResearchHistory,refs:readonly LiveEvidenceReference[],complete:boolean
):boolean{
 if(!complete||!canonical.test(variantId)||!recordedConflictFocus(history,variantId)||
    refs.length>200)return false;
 const ids=new Set<number>();
 for(const ref of refs){
  if(!safeSource(ref,variantId)||ids.has(ref.id))return false;
  ids.add(ref.id);
 }
 return true;
}
/** Add at most 30 unique, manually selected conflict + reference pairs. */
export function createEvidenceConflictTrace(
 variantId:string,history:ResearchHistory,refs:readonly LiveEvidenceReference[],
 complete:boolean,input:EvidenceConflictTraceInput,existing:readonly EvidenceConflictTraceEntry[]=[]
):EvidenceConflictTraceEntry|null{
 if(!validContext(variantId,history,refs,complete)||existing.length>=30)return null;
 const focus=recordedConflictFocus(history,variantId);
 if(!focus||!Number.isSafeInteger(input.conflictId)||!Number.isSafeInteger(input.referenceId)||
    !focus.unresolved.some(c=>c.id===input.conflictId)||
    !refs.some(r=>r.id===input.referenceId)||
    !Object.hasOwn(relationLabels,input.relation)||
    existing.some(e=>e.conflictId===input.conflictId&&e.referenceId===input.referenceId)||
    existing.some(e=>e.variantId!==variantId))return null;
 const question=clean(input.question,15,240);
 const locator=clean(input.locator,4,180);
 const interpretation=clean(input.interpretation,20,900);
 if(!question||!locator||!interpretation)return null;
 return Object.freeze({
  variantId,conflictId:input.conflictId,referenceId:input.referenceId,
  relation:input.relation,question,locator,interpretation
 });
}
function markdown(value:string):string{
 // Render author-entered/source text as inert Markdown, not new headings,
 // task marks, links, table cells or declaration blocks.
 return value.replace(/[\u0000-\u001f\u007f\u2028\u2029]/g,' ')
  .replace(/([\\`*_{}\[\]()#+.!|>~])/g,'\\$1');
}
/** Export only complete, still-valid, locally entered mappings. Never infer them. */
export function prepareEvidenceConflictTraceability(
 variantId:string,history:ResearchHistory,refs:readonly LiveEvidenceReference[],
 entries:readonly EvidenceConflictTraceEntry[],complete:boolean
):string|null{
 if(!validContext(variantId,history,refs,complete)||!entries.length||entries.length>30)return null;
 const focus=recordedConflictFocus(history,variantId);
 if(!focus)return null;
 const verified:EvidenceConflictTraceEntry[]=[];
 for(const entry of entries){
  const candidate=createEvidenceConflictTrace(variantId,history,refs,true,entry,verified);
  if(!candidate||entry.variantId!==variantId||entry.question!==candidate.question||
     entry.locator!==candidate.locator||entry.interpretation!==candidate.interpretation)return null;
  verified.push(candidate);
 }
 const result=[
  '# neumuacFQ | Local research evidence-to-conflict worksheet',
  '',
  'Status: UNSUBMITTED PROVISIONAL RESEARCH NOTES; NOT VERIFIED, APPROVED OR SAVED',
  'Variant record: '+variantId,
  'User-entered candidate relationships: '+verified.length,
  'Scope: Only recorded, currently unresolved contradiction IDs and complete variant-linked reference metadata.',
  'No database-stored conflict-to-reference relationship is established by this worksheet.',
  '',
  '## Researcher-entered candidate links',
  ...verified.flatMap((entry,index)=>{
   const conflict=focus.unresolved.find(c=>c.id===entry.conflictId)!;
   const ref=refs.find(r=>r.id===entry.referenceId)!;
   return [
    '',
    '### Working link '+(index+1)+' — conflict #'+entry.conflictId+' / reference #'+entry.referenceId,
    '- Recorded conflict field: '+markdown(conflict.field),
    '- Recorded severity (not a clinical priority): '+markdown(conflict.recordedSeverity||'Not recorded'),
    '- Catalogued reference title: '+markdown(ref.title),
    '- Catalogued source: '+markdown(ref.source),
    '- Recorded PMID: '+markdown(ref.pmid||'Not recorded'),
    '- Recorded DOI: '+markdown(ref.doi||'Not recorded'),
    '- Reference URL: '+ref.url,
    '- User-selected provisional relationship: '+relationLabels[entry.relation],
    '- Question under examination (user-entered): '+markdown(entry.question),
    '- Exact source locator to independently verify (user-entered): '+markdown(entry.locator),
    '- Working interpretation (user-entered): '+markdown(entry.interpretation)
   ];
  }),
  '',
  '## Mandatory independent verification',
  '- Open each original reference and confirm the citation, passage, patient-free context and exact scientific statement.',
  '- Check the underlying recorded conflicting values; only the field name is exposed in this read-only view.',
  '- A possible corroboration or disagreement is a local research hypothesis, never a verified scientific determination.',
  '- This file is not submitted to the server, has no verified contributor identity or timestamp, and is not an audit record.',
  '- Any actual research decision requires its independently authorized server workflow; this file cannot authorize clinical actions.'
 ];
 return result.join('\n');
}
