import type {LegacyEtiCategory} from '../services/legacyEtiResponse';
import type {RecordedModulatorResponse} from '../services/sourceSpecificResponse';

/** Presentation-only mappings. Scientific review and validation are separate workflows. */
export type ResponseDisplayTone='unresolved'|'recorded';
export interface ResponseDisplay {
 readonly label:string;
 readonly tone:ResponseDisplayTone;
}
/** Display the actual response field in familiar clinical research terminology. */
export function describeRecordedEti(value:LegacyEtiCategory|null):ResponseDisplay{
 switch(value){
  case 'responsive':return Object.freeze({
   label:'Responsive',tone:'recorded'
  });
  case 'non_responsive':return Object.freeze({
   label:'Non-responsive',tone:'recorded'
  });
  case 'unknown':return Object.freeze({
   label:'Unknown',tone:'unresolved'
  });
  default:return Object.freeze({
   label:'Not recorded',tone:'unresolved'
  });
 }
}

/** Source-specific response labels, keeping missing and unknown distinct. */
export function describeSourceFinding(value:RecordedModulatorResponse):string{
 switch(value){
  case 'responsive':return 'Responsive';
  case 'non_responsive':return 'Non-responsive';
  case 'mixed':return 'Mixed';
  case 'inconclusive':return 'Inconclusive';
  case 'unknown':return 'Unknown';
  default:return 'Not recorded';
 }
}
