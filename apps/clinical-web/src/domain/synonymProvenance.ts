import type {RealVariant} from '../services/liveVariants';
import {explainTextMatch} from './searchPresentation';
import {historicalDiscoveryHint} from './legacyDiscoveryHints';

export type SynonymAssessment =
 | {readonly kind:'recorded-match';readonly recordId:string;readonly matchedField:string;readonly recordedValue:string}
 | {readonly kind:'historical-lead';readonly suggestedName:string;readonly candidates:readonly string[];readonly scope:'visible-page-only'}
 | {readonly kind:'no-evidence'};

/** Local, read-only provenance classification. Does NOT validate scientific equivalence. */
export function assessSynonymProvenance(
 query:string,visibleRecords:readonly RealVariant[]
):SynonymAssessment {
 const q=query.trim();
 if(!q)return {kind:'no-evidence'};
 const matching=visibleRecords.map(record=>({record,match:explainTextMatch(record,q)}))
  .filter(entry=>entry.match?.priority!==undefined && entry.match.priority<4);
 // An exact recorded text match may only identify a record when unambiguous
 // in this *visible collection*; callers must never auto-open it.
 if(matching.length===1){
  const {record,match}=matching[0];
  return {kind:'recorded-match',recordId:record.id,matchedField:match!.label,recordedValue:match!.matchedValue};
 }
 const historical=historicalDiscoveryHint(q);
 if(!historical)return {kind:'no-evidence'};
 const candidates=visibleRecords.filter(record=>explainTextMatch(record,historical.suggestedName)?.priority===0)
  .map(record=>record.id);
 return {kind:'historical-lead',suggestedName:historical.suggestedName,
  candidates,scope:'visible-page-only'};
}
