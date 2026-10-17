import type {ScientificDossier} from '../services/scientificDossier';

/**
 * Presence of a DB field is not evidence verification, quality scoring,
 * or a required-field assessment. It is only a literal data inventory.
 */
export interface RecordedFieldInventory {
 readonly recorded:readonly string[];
 readonly absent:readonly string[];
}
export function scientificFieldInventory(dossier:ScientificDossier):RecordedFieldInventory{
 const values:readonly [string,string|number|null][]=[
  ['Functional class',dossier.functionalClass],
  ['Subtype',dossier.subtype],
  ['Determination',dossier.recordedDetermination],
  ['Confidence label',dossier.confidence],
  ['Source summary',dossier.sourceSummary],
  ['Data status',dossier.dataStatus],
  ['Validation count',dossier.validationCount],
  ['Last validation date',dossier.lastValidatedAt],
  ['Last evidence update',dossier.lastEvidenceUpdate],
  ['ClinVar identifier',dossier.clinvarId]
 ];
 const recorded:string[]=[],absent:string[]=[];
 for(const [name,value] of values){
  if(value!==null&&(typeof value==='number'||value.trim().length>0))recorded.push(name);
  else absent.push(name);
 }
 return Object.freeze({recorded:Object.freeze(recorded),absent:Object.freeze(absent)});
}
