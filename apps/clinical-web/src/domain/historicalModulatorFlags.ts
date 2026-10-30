import type {RecordedResponse,CoreModulatorId,VariantTherapyProfile} from './therapyRegistry';
export interface HistoricalModulatorFlags{
 readonly eti:boolean|null;
 readonly alyftrek:boolean|null;
}
function readBoolean(row:Record<string,unknown>,field:'eti'|'alyftrek'):boolean|null{
 if(!Object.hasOwn(row,field)||row[field]===null)return null;
 if(typeof row[field]!=='boolean')throw new Error('Invalid historical '+field+' flag');
 return row[field] as boolean;
}
/** Separate legacy JSON flags. A missing Alyftrek key means *unrecorded*,
 * not a negative response. No flag is an independently validated drug result.
 */
export function decodeHistoricalModulatorFlags(value:unknown):HistoricalModulatorFlags{
 if(value===null)return Object.freeze({eti:null,alyftrek:null});
 if(typeof value!=='object'||Array.isArray(value))throw new Error('Malformed historical therapy flag register');
 const row=value as Record<string,unknown>;
 return Object.freeze({eti:readBoolean(row,'eti'),alyftrek:readBoolean(row,'alyftrek')});
}
export type HistoricalFlagAssessment='different-recorded-fields'|'same-recorded-fields'|'not-comparable';
export function assessHistoricalFlag(response:RecordedResponse,flag:boolean|null):HistoricalFlagAssessment{
 if(flag===null||response===null||response==='unknown')return 'not-comparable';
 const expected=response==='responsive';
 return expected===flag?'same-recorded-fields':'different-recorded-fields';
}
export interface HistoricalFlagFinding {
 readonly therapy:'ETI'|'ALYFTREK';
 readonly response:RecordedResponse;
 readonly flag:boolean|null;
 readonly state:HistoricalFlagAssessment;
}
export function historicalFlagFindings(profile:VariantTherapyProfile):readonly HistoricalFlagFinding[]{
 return Object.freeze((['ETI','ALYFTREK'] as const).map(therapy=>{
  const record=profile.entries.find(entry=>entry.therapy===therapy);
  const flag=therapy==='ETI'?profile.legacyDrugFlags.eti:profile.legacyDrugFlags.alyftrek;
  return Object.freeze({therapy,response:record?.response??null,flag,
   state:assessHistoricalFlag(record?.response??null,flag)});
 }));
}
