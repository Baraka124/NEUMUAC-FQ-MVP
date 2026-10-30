import {resolveTherapyName,type CoreModulatorId} from '../domain/therapyRegistry';
import {readConfigFromEnvironment,validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';

export interface RegulatoryRecord {
 readonly id:number;
 readonly therapy:CoreModulatorId;
 readonly drugName:string;
 readonly jurisdiction:string;
 readonly regulator:string;
 readonly recordedRule:string|null;
 readonly recordedDate:string|null;
}
export interface SafetyRecord {
 readonly id:number;
 readonly therapy:CoreModulatorId|null;
 readonly drugName:string;
 readonly title:string;
 readonly severity:string;
 readonly jurisdiction:string;
 readonly sourceLabel:string|null;
}
export interface DrugReferenceRegister{
 readonly rules:readonly RegulatoryRecord[];
 readonly alerts:readonly SafetyRecord[];
 readonly otherMedicationAlerts:number;
}
function o(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new VariantConnectionError('schema-mismatch','Invalid drug reference record');
 return value as Record<string,unknown>;
}
function str(value:unknown,max=1200):string|null{
 if(value===null||value===undefined)return null;
 if(typeof value!=='string'||value.length>max)throw new VariantConnectionError('schema-mismatch','Invalid drug reference text');
 return value.trim()||null;
}
function posId(value:unknown):number{
 if(typeof value!=='number'||!Number.isSafeInteger(value)||value<=0)throw new VariantConnectionError('schema-mismatch','Invalid drug record identifier');
 return value;
}
function drug(value:string):CoreModulatorId|null{
 const normalized=value.replace(/\s*\((?:ETI|VTD|IVA|TEZ\/IVA)\)\s*$/i,'');
 return resolveTherapyName(normalized)||resolveTherapyName(value);
}
export function decodeRegulatoryRecord(input:unknown):RegulatoryRecord{
 const v=o(input),name=str(v.drug_name,150),therapy=name?drug(name):null;
 if(!name||!therapy)throw new VariantConnectionError('schema-mismatch','Unrecognized regimen rule');
 if(v.is_active!==true)throw new VariantConnectionError('schema-mismatch','Inactive rule in active register');
 const date=str(v.approval_date,20);
 if(date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new VariantConnectionError('schema-mismatch','Invalid recorded approval date');
 return Object.freeze({id:posId(v.id),therapy,drugName:name,
  jurisdiction:str(v.jurisdiction,60)||'Not recorded',
  regulator:str(v.regulator,100)||'Not recorded',
  recordedRule:str(v.eligible_rule,5000),
  recordedDate:date
 });
}
export function decodeSafetyRecord(input:unknown):SafetyRecord{
 const v=o(input),name=str(v.drug_name,150),title=str(v.title,400);
 if(!name||!title||v.is_active!==true)throw new VariantConnectionError('schema-mismatch','Invalid safety register row');
 return Object.freeze({
  id:posId(v.id),therapy:drug(name),drugName:name,title,
  severity:str(v.severity,70)||'Not specified',
  jurisdiction:str(v.jurisdiction,80)||'Not recorded',
  sourceLabel:str(v.source_label,150)
 });
}
function uniqueIds<T extends {readonly id:number}>(rows:readonly T[]):void{
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new VariantConnectionError('schema-mismatch','Duplicated reference records');
}
/** GET only. Database active flags describe stored records, NOT current approval
 * or validated prescribing/safety status.
 */
export function createDrugReferenceSource(config:ReadOnlyConfig,transport:typeof fetch=fetch,session?:ReadSessionProvider){
 const root=validateReadOnlyConfig(config);
 async function get(table:'drug_jurisdiction_rules'|'drug_safety_alerts',cols:string,signal?:AbortSignal):Promise<unknown[]>{
  const url=new URL('/rest/v1/'+table,root);
  url.search=new URLSearchParams({select:cols,is_active:'eq.true',order:'id.asc',limit:'100'}).toString();
  const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
  if(config.accessMode==='authenticated'){
   const token=await session?.getAccessToken();
   if(!token||token===config.publishableKey)throw new VariantConnectionError('authentication-required','Authorized session required');
   headers.Authorization='Bearer '+token;
  }else if(config.accessMode===undefined||config.accessMode==='anonymous'){
   if(!config.publishableKey.startsWith('sb_publishable_'))headers.Authorization='Bearer '+config.publishableKey;
  }else throw new VariantConnectionError('invalid-configuration','Invalid read mode');
  let res:Response;
  try{res=await transport(url.toString(),{method:'GET',headers,signal,cache:'no-store',credentials:'omit',redirect:'error'});}
  catch(e){if(signal?.aborted)throw e;throw new VariantConnectionError('request-failed','Drug reference lookup failed');}
  if(signal?.aborted)throw new VariantConnectionError('request-failed','Reference lookup cancelled');
  if(res.status===401||res.status===403)throw new VariantConnectionError('access-denied','Drug reference access restricted');
  if(!res.ok)throw new VariantConnectionError('request-failed','Drug reference unavailable');
  const len=Number(res.headers.get('content-length'));
  if(Number.isFinite(len)&&len>260000)throw new VariantConnectionError('schema-mismatch','Drug reference response too large');
  const raw=await res.text();
  if(raw.length>260000)throw new VariantConnectionError('schema-mismatch','Drug reference response too large');
  let payload:unknown;
  try{payload=JSON.parse(raw);}catch{throw new VariantConnectionError('schema-mismatch','Invalid drug reference response');}
  if(!Array.isArray(payload)||payload.length>=100)throw new VariantConnectionError('schema-mismatch','Incomplete drug reference page');
  return payload;
 }
 return Object.freeze({
  async list(signal?:AbortSignal):Promise<DrugReferenceRegister>{
   const [rulesRaw,alertsRaw]=await Promise.all([
    get('drug_jurisdiction_rules','id,drug_name,jurisdiction,regulator,approval_date,eligible_rule,is_active',signal),
    get('drug_safety_alerts','id,drug_name,title,severity,jurisdiction,source_label,is_active',signal)
   ]);
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Reference lookup cancelled');
   const rules=rulesRaw.map(decodeRegulatoryRecord),alerts=alertsRaw.map(decodeSafetyRecord);
   uniqueIds(rules);uniqueIds(alerts);
   return Object.freeze({rules:Object.freeze(rules),alerts:Object.freeze(alerts),
    otherMedicationAlerts:alerts.filter(a=>a.therapy===null).length});
  }
 });
}
export function configuredDrugReferenceSource(){
 const config=readConfigFromEnvironment();
 return config?createDrugReferenceSource(config):null;
}
