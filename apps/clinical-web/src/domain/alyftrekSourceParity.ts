import type {RecordedResponse} from './therapyRegistry';
import type {SourceSpecificResponse,RecordedModulatorResponse} from '../services/sourceSpecificResponse';

/** Compare independent Alyftrek register and source-specific fields. These are
 * historical data-consistency signals, not a scientific adjudication.
 */
export interface DrugSourceComparison{
 readonly state:'requires-review'|'incomplete'|'aligned-recorded-fields';
 readonly relevantSourceCount:number;
 readonly findings:readonly string[];
 readonly conflictingSourceIds:readonly string[];
}
const definitive=(x:RecordedModulatorResponse):x is 'responsive'|'non_responsive'=>
 x==='responsive'||x==='non_responsive';
export function assessAlyftrekSourceParity(
 variantId:string,category:RecordedResponse,rows:readonly SourceSpecificResponse[]
):DrugSourceComparison{
 if(!/^[1-9]\d{0,17}$/.test(variantId)||rows.some(r=>r.variantId!==variantId))
  throw new Error('Cannot compare unrelated source records');
 const relevant=rows.filter(row=>row.alyftrek!==null);
 const findings:string[]=[];
 const conflicts=new Set<string>();
 if(definitive(category)){
  for(const row of relevant){
   if(definitive(row.alyftrek)&&row.alyftrek!==category)conflicts.add(row.id);
  }
  if(conflicts.size)findings.push('Recorded Alyftrek variant category differs from source-specific response.');
 }
 const positive=relevant.filter(row=>row.alyftrek==='responsive');
 const negative=relevant.filter(row=>row.alyftrek==='non_responsive');
 if(positive.length&&negative.length){
  findings.push('Alyftrek source-specific records contain different response categories.');
  for(const row of [...positive,...negative])conflicts.add(row.id);
 }
 if(!relevant.length)findings.push('No Alyftrek source-specific response is recorded in this register.');
 if(category==='unknown'||category===null)findings.push('The Alyftrek variant category is unknown or not recorded.');
 const state=conflicts.size?'requires-review':!relevant.length||category==='unknown'||category===null?'incomplete':'aligned-recorded-fields';
 return Object.freeze({state,relevantSourceCount:relevant.length,findings:Object.freeze(findings),
  conflictingSourceIds:Object.freeze([...conflicts])});
}
