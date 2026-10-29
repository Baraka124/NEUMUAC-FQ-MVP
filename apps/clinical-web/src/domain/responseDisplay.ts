import type {LegacyEtiCategory} from '../services/legacyEtiResponse';

/**
 * Display-only copy. Preserves the historical ETI value independently of
 * patient-level response, regulatory indication, and source verification.
 */
export type ResponseDisplayTone='unresolved'|'recorded';
export interface ResponseDisplay {
 readonly label:string;
 readonly description:string;
 readonly tone:ResponseDisplayTone;
}
export function describeRecordedEti(value:LegacyEtiCategory|null):ResponseDisplay{
 switch(value){
  case 'responsive':return Object.freeze({
   label:'Responsive',description:'Recorded in the original research register.',tone:'recorded'
  });
  case 'non_responsive':return Object.freeze({
   label:'Non-responsive',description:'Recorded in the original research register.',tone:'recorded'
  });
  case 'unknown':return Object.freeze({
   label:'Unknown',description:'No ETI category determined in the original register.',tone:'unresolved'
  });
  default:return Object.freeze({
   label:'Not recorded',description:'No ETI category was returned for this record.',tone:'unresolved'
  });
 }
}
