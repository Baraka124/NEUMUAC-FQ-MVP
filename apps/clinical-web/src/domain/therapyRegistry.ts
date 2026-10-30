import type {ModulatorId} from './modulatorEvidence';

/** Five distinct regimens implemented by the frozen five-drug calculator.
 * Brand aliases do not create additional therapies.
 * This is a functional inventory, not a current formulary or eligibility table.
 */
export type CoreModulatorId=Exclude<ModulatorId,'OTHER'>;
export type ResponseField='eti_prediction'|'alyftrek_prediction';
export interface TherapyDefinition{
 readonly id:CoreModulatorId;
 readonly label:string;
 readonly brands:readonly string[];
 readonly ingredients:readonly string[];
 readonly responseField:ResponseField|null;
 readonly originalCalculator:true;
 readonly originalEuRule:boolean;
}
export const THERAPIES:readonly TherapyDefinition[]=Object.freeze([
 Object.freeze({id:'ETI',label:'ETI',brands:Object.freeze(['Kaftrio','Trikafta']),ingredients:Object.freeze(['elexacaftor','tezacaftor','ivacaftor']),responseField:'eti_prediction',originalCalculator:true,originalEuRule:true}),
 Object.freeze({id:'ALYFTREK',label:'Alyftrek',brands:Object.freeze(['Alyftrek']),ingredients:Object.freeze(['vanzacaftor','tezacaftor','deutivacaftor']),responseField:'alyftrek_prediction',originalCalculator:true,originalEuRule:true}),
 Object.freeze({id:'IVACAFTOR',label:'Kalydeco',brands:Object.freeze(['Kalydeco']),ingredients:Object.freeze(['ivacaftor']),responseField:null,originalCalculator:true,originalEuRule:true}),
 Object.freeze({id:'TEZACAFTOR_IVACAFTOR',label:'Symkevi / Symdeko',brands:Object.freeze(['Symkevi','Symdeko']),ingredients:Object.freeze(['tezacaftor','ivacaftor']),responseField:null,originalCalculator:true,originalEuRule:true}),
 Object.freeze({id:'LUMACAFTOR_IVACAFTOR',label:'Orkambi',brands:Object.freeze(['Orkambi']),ingredients:Object.freeze(['lumacaftor','ivacaftor']),responseField:null,originalCalculator:true,originalEuRule:false})
]);
const names=new Map<string,CoreModulatorId>();
function normalize(value:string):string{return value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'');}
for(const therapy of THERAPIES){
 for(const alias of [therapy.id,therapy.label,...therapy.brands,therapy.ingredients.join('/'),therapy.ingredients.join(' + ')]){
  const key=normalize(alias),previous=names.get(key);
  if(previous&&previous!==therapy.id)throw new Error('Ambiguous therapy alias: '+alias);
  names.set(key,therapy.id);
 }
}
export function resolveTherapyName(value:unknown):CoreModulatorId|null{
 if(typeof value!=='string'||value.length>100)return null;
 return names.get(normalize(value))??null;
}
export function getTherapy(id:CoreModulatorId):TherapyDefinition{
 const therapy=THERAPIES.find(t=>t.id===id);
 if(!therapy)throw new Error('Unknown therapy');
 return therapy;
}
export type RecordedResponse='responsive'|'non_responsive'|'unknown'|null;
export interface VariantTherapyProfile {
 readonly variantId:string;
 readonly functionalClass:string|null;
 readonly classSubtype:string|null;
 readonly validationCount:number|null;
 readonly entries:readonly TherapyEntry[];
}
export interface TherapyEntry {
 readonly therapy:CoreModulatorId;
 readonly coverage:'variant-response'|'genotype-rule-only';
 readonly response:RecordedResponse;
 readonly evidenceLevel:string|null;
 readonly evidenceTier:string|null;
 readonly authoritySource:string|null;
}
/** Identity-preserving projection: Class I, exceptional subtype and drug responses
 * are independent. Do not infer treatment eligibility or rewrite missing fields.
 */
export function projectVariantTherapies(input:{
 id:string;functionalClass:string|null;classSubtype:string|null;validationCount:number|null;
 eti:RecordedResponse;alyftrek:RecordedResponse;
 etiEvidenceLevel:string|null;alyftrekEvidenceLevel:string|null;
 etiEvidenceTier:string|null;alyftrekEvidenceTier:string|null;
 etiAuthority:string|null;alyftrekAuthority:string|null;
}):VariantTherapyProfile{
 const entries=THERAPIES.map(t=>Object.freeze({
  therapy:t.id,
  coverage:t.responseField===null?'genotype-rule-only' as const:'variant-response' as const,
  response:t.id==='ETI'?input.eti:t.id==='ALYFTREK'?input.alyftrek:null,
  evidenceLevel:t.id==='ETI'?input.etiEvidenceLevel:t.id==='ALYFTREK'?input.alyftrekEvidenceLevel:null,
  evidenceTier:t.id==='ETI'?input.etiEvidenceTier:t.id==='ALYFTREK'?input.alyftrekEvidenceTier:null,
  authoritySource:t.id==='ETI'?input.etiAuthority:t.id==='ALYFTREK'?input.alyftrekAuthority:null
 }));
 return Object.freeze({
  variantId:input.id,functionalClass:input.functionalClass,
  classSubtype:input.classSubtype,validationCount:input.validationCount,
  entries:Object.freeze(entries)
 });
}
