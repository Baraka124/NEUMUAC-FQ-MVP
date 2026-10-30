import type {LegacyEtiCategory} from '../services/legacyEtiResponse';
import type {RecordedModulatorResponse} from '../services/sourceSpecificResponse';

/**
 * Display-only copy. Preserves the historical ETI value independently of
 * patient-level response, regulatory indication, and source verification.
 */
export type ResponseDisplayTone='unresolved'|'recorded';
export interface ResponseDisplay {
 readonly label:string;
 readonly tone:ResponseDisplayTone;
}
/** The label is one complete sentence fragment, never an isolated clinical verdict. */
export function describeRecordedEti(value:LegacyEtiCategory|null):ResponseDisplay{
 switch(value){
  case 'responsive':return Object.freeze({
   label:'Historically classified as responsive',tone:'recorded'
  });
  case 'non_responsive':return Object.freeze({
   label:'Historically classified as non-responsive',tone:'recorded'
  });
  case 'unknown':return Object.freeze({
   label:'Historical classification unknown',tone:'unresolved'
  });
  default:return Object.freeze({
   label:'No historical classification recorded',tone:'unresolved'
  });
 }
}

/** Short source-register labels for a dense reference list. Not medical findings. */
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
