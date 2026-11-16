import {endpointComparisonKey,validResearchEndpoint,type ResearchEndpoint} from '../domain/researchEndpointNormalization';
import type {CoreModulatorId} from '../domain/therapyRegistry';
import type {
 ResearchClaimScope,ResearchObservationMethod,ResearchObservationFinding
} from '../domain/sourceConflictReconciliation';
import {
 validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider
} from './liveVariants';

export interface ApprovedDatasetRow {
 readonly claimId:string;
 readonly seriesId:string;
 readonly revision:number;
 readonly variantId:string;
 readonly referenceId:number;
 readonly referenceTitle:string;
 readonly referenceUrl:string;
 readonly referencePmid:string|null;
 readonly referenceDoi:string|null;
 readonly therapy:CoreModulatorId;
 readonly studyFamilyId:string;
 readonly scope:ResearchClaimScope;
 readonly genotypePair:readonly [string,string]|null;
 readonly method:ResearchObservationMethod;
 readonly finding:ResearchObservationFinding;
 readonly locator:string;
 readonly endpoint:ResearchEndpoint|null;
 readonly reviewCount:2;
 readonly reviewedAt:string;
}
export interface ApprovedDatasetSnapshot {
 readonly schemaVersion:1;
 readonly source:'nfq-approved-research-dataset-v1';
 readonly snapshotSha256:string;
 readonly generatedAt:string;
 readonly total:number;
 readonly records:readonly ApprovedDatasetRow[];
 readonly limitations:readonly string[];
}
export type DatasetReadiness='unextracted'|'qualitative-only'|'nonstandard-numeric'|'context-bounded-numeric';
export interface DatasetQualityRow{
 readonly record:ApprovedDatasetRow;
 readonly readiness:DatasetReadiness;
 readonly contextKey:string|null;
 readonly studyFamilyDuplicates:number;
 readonly flags:readonly string[];
}
export interface ApprovedDatasetQuality{
 readonly total:number;
 readonly independentStudyFamilies:number;
 readonly variants:number;
 readonly therapies:number;
 readonly numeric:number;
 readonly contextBounded:number;
 readonly qualitativeOnly:number;
 readonly unextracted:number;
 readonly nonstandardNumeric:number;
 readonly reviewWarnings:number;
 readonly groups:readonly {readonly contextKey:string;readonly observations:number;readonly studyFamilies:number}[];
 readonly rows:readonly DatasetQualityRow[];
}

const canonical=/^[1-9][0-9]{0,17}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const shaPattern=/^[0-9a-f]{64}$/;
const bearerPattern=/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
const therapies=new Set<CoreModulatorId>([
 'ETI','ALYFTREK','IVACAFTOR','LUMACAFTOR_IVACAFTOR','TEZACAFTOR_IVACAFTOR'
]);
const scopes=new Set(['single-variant','genotype-specific']);
const methods=new Set(['clinical-study','in-vitro-study','curated-literature']);
const findings=new Set(['reported-response','reported-no-response','mixed','inconclusive']);
const trustedHosts=new Set([
 'pubmed.ncbi.nlm.nih.gov','www.ncbi.nlm.nih.gov','cftr2.org','www.cftr2.org',
 'doi.org','scholar.google.com'
]);
function fail(message:string):never{
 throw new VariantConnectionError('schema-mismatch',message);
}
function object(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Invalid approved dataset structure');
 return value as Record<string,unknown>;
}
function str(value:unknown,label:string,max:number):string{
 if(typeof value!=='string'||!value.trim()||value.length>max)fail('Invalid '+label);
 return value.trim();
}
function optional(value:unknown,label:string,max:number):string|null{
 if(value===null)return null;
 return str(value,label,max);
}
function timestamp(value:unknown,label:string):string{
 const s=str(value,label,80);
 if(!Number.isFinite(Date.parse(s)))fail('Invalid '+label);
 return s;
}
function safeReferenceUrl(value:unknown):string{
 const s=str(value,'bibliographic source URL',1600);
 let u:URL;
 try{u=new URL(s);}catch{return fail('Invalid source URL');}
 if(u.protocol!=='https:'||u.username||u.password||u.port||!trustedHosts.has(u.hostname))
  fail('Source domain is not in the verified catalogue allowlist');
 return u.toString();
}
function decodeEndpoint(raw:unknown):ResearchEndpoint|null{
 if(raw===null)return null; // Earlier approved claims can lack the endpoint column.
 const value=object(raw);
 const keys=['code','statistic','unit','value','model','comparator','timepoint'];
 if(Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k)))
  fail('Unexpected source endpoint fields');
 const endpoint=value as unknown as ResearchEndpoint;
 if(!validResearchEndpoint(endpoint))fail('Source endpoint failed biological and unit validation');
 return Object.freeze({...endpoint});
}
function decodeRow(raw:unknown):ApprovedDatasetRow{
 const data=object(raw);
 const claimId=str(data.claimId,'claim identifier',36);
 const seriesId=str(data.seriesId,'series identifier',36);
 const variantId=str(data.variantId,'variant identifier',18);
 if(!UUID.test(claimId)||!UUID.test(seriesId)||!canonical.test(variantId))
  fail('Invalid source or variant provenance identity');
 const revision=data.revision;
 if(typeof revision!=='number'||!Number.isSafeInteger(revision)||revision<1||revision>100)
  fail('Invalid approved revision');
 const referenceId=data.referenceId;
 if(typeof referenceId!=='number'||!Number.isSafeInteger(referenceId)||referenceId<1)
  fail('Invalid linked reference identity');
 const therapy=data.therapy as CoreModulatorId;
 if(!therapies.has(therapy)||!scopes.has(data.scope as string)||
  !methods.has(data.method as string)||!findings.has(data.finding as string))
  fail('Invalid study scope, therapy or finding');
 const scope=data.scope as ResearchClaimScope;
 let genotypePair:readonly [string,string]|null=null;
 if(scope==='genotype-specific'){
  const p=data.genotypePair;
  if(!Array.isArray(p)||p.length!==2||p.some(x=>typeof x!=='string'||!canonical.test(x))||
   !p.includes(variantId))fail('Genotype pair is not linked to the selected variant');
  genotypePair=Object.freeze([p[0] as string,p[1] as string]);
 }else if(data.genotypePair!==null){
  fail('Single-variant study has a genotype pair');
 }
 if(data.reviewCount!==2)fail('Research source lacks two independent approvals');
 return Object.freeze({
  claimId,seriesId,revision,variantId,referenceId,
  referenceTitle:str(data.referenceTitle,'reference title',2000),
  referenceUrl:safeReferenceUrl(data.referenceUrl),
  referencePmid:optional(data.referencePmid,'PMID',60),
  referenceDoi:optional(data.referenceDoi,'DOI',200),
  therapy,studyFamilyId:str(data.studyFamilyId,'study-family identity',120),
  scope,genotypePair,method:data.method as ResearchObservationMethod,
  finding:data.finding as ResearchObservationFinding,
  locator:str(data.locator,'source locator',240),
  endpoint:decodeEndpoint(data.endpoint),
  reviewCount:2,reviewedAt:timestamp(data.reviewedAt,'independent-review time')
 });
}
export function decodeApprovedDataset(input:unknown):ApprovedDatasetSnapshot{
 const data=object(input);
 if(data.source!=='nfq-approved-research-dataset-v1'||data.schemaVersion!==1||
  typeof data.snapshotSha256!=='string'||!shaPattern.test(data.snapshotSha256)||
  !Array.isArray(data.records)||data.records.length>1000||
  data.total!==data.records.length||!Array.isArray(data.limitations)||
  data.limitations.length!==3||
  data.limitations.some((v:unknown)=>typeof v!=='string'||!v.trim()||v.length>180))
  fail('Incomplete or incompatible approved dataset snapshot');
 const entries=data.records.map(decodeRow);
 const claimIds=new Set(entries.map((x:ApprovedDatasetRow)=>x.claimId));
 const series=new Set(entries.map((x:ApprovedDatasetRow)=>x.seriesId));
 if(claimIds.size!==entries.length||series.size!==entries.length)
  fail('Duplicate approved claim or active series revision');
 const ordered=[...entries].sort((a,b)=>{
  const v=BigInt(a.variantId)-BigInt(b.variantId);
  if(v!==0n)return v<0n?-1:1;
  return a.therapy.localeCompare(b.therapy)||
   a.studyFamilyId.localeCompare(b.studyFamilyId)||a.claimId.localeCompare(b.claimId);
 });
 if(ordered.some((row,i)=>row.claimId!==entries[i]?.claimId))
  fail('Approved research snapshot is not in canonical source order');
 return Object.freeze({
  schemaVersion:1,source:'nfq-approved-research-dataset-v1',
  snapshotSha256:data.snapshotSha256,generatedAt:timestamp(data.generatedAt,'snapshot creation'),
  total:entries.length,records:Object.freeze(entries),
  limitations:Object.freeze([...data.limitations as string[]])
 });
}
export function assessApprovedDataset(snapshot:ApprovedDatasetSnapshot):ApprovedDatasetQuality{
 const families=new Set<string>();
 const byFamily=new Map<string,number>();
 const groups=new Map<string,Set<string>>();
 const groupCounts=new Map<string,number>();
 for(const row of snapshot.records){
  const family=[row.variantId,row.therapy,row.studyFamilyId].join('|');
  families.add(family);byFamily.set(family,(byFamily.get(family)||0)+1);
 }
 const rows=snapshot.records.map(record=>{
  const endpoint=record.endpoint;
  const key=endpoint?endpointComparisonKey(
   endpoint,record.scope,record.genotypePair??undefined,record.method
  ):null;
  let readiness:DatasetReadiness='unextracted';
  if(endpoint&&endpoint.code!=='not-reported'){
   if(endpoint.value===null)readiness='qualitative-only';
   else readiness=key===null?'nonstandard-numeric':'context-bounded-numeric';
  }
  if(key){
   const scoped=record.variantId+'|'+record.therapy+'|'+key;
   groups.set(scoped,new Set([...(groups.get(scoped)||[]),record.studyFamilyId]));
   groupCounts.set(scoped,(groupCounts.get(scoped)||0)+1);
  }
  const flags:string[]=[];
  if(!endpoint||endpoint.code==='not-reported')flags.push('Experimental endpoint has not been extracted');
  else if(endpoint.value===null)flags.push('No numerical outcome recorded');
  else if(key===null)flags.push('Measurement is not cross-study-comparable under the current context rules');
  if(record.method==='in-vitro-study'&&endpoint?.model==='clinical'||
   record.method==='clinical-study'&&endpoint?.model==='cell-line')
   flags.push('Research method and endpoint model require scientific reconciliation');
  const studyFamily=record.variantId+'|'+record.therapy+'|'+record.studyFamilyId;
  const count=byFamily.get(studyFamily)??0;
  if(count>1)flags.push('Multiple source rows from one study family: not independent replication');
  return Object.freeze({
   record,readiness,contextKey:key,studyFamilyDuplicates:count,
   flags:Object.freeze(flags)
  });
 });
 const datasetGroups=[...groups.entries()].map(([key,studies])=>Object.freeze({
  contextKey:key,observations:groupCounts.get(key)??0,studyFamilies:studies.size
 }));
 return Object.freeze({
  total:snapshot.total,independentStudyFamilies:families.size,
  variants:new Set(snapshot.records.map(x=>x.variantId)).size,
  therapies:new Set(snapshot.records.map(x=>x.therapy)).size,
  numeric:rows.filter(x=>x.record.endpoint?.value!==null&&
   x.record.endpoint?.value!==undefined).length,
  contextBounded:rows.filter(x=>x.readiness==='context-bounded-numeric').length,
  qualitativeOnly:rows.filter(x=>x.readiness==='qualitative-only').length,
  unextracted:rows.filter(x=>x.readiness==='unextracted').length,
  nonstandardNumeric:rows.filter(x=>x.readiness==='nonstandard-numeric').length,
  reviewWarnings:rows.reduce((n,x)=>n+x.flags.length,0),
  groups:Object.freeze(datasetGroups),rows:Object.freeze(rows)
 });
}
function csvCell(value:string|number|null):string{
 const text=value===null?'':String(value);
 const safe=/^[=+@\-\t\r\n]/.test(text)?"'"+text:text;
 return '"'+safe.replace(/"/g,'""')+'"';
}
/** CSV contains source-approved rows only. Missing measurements stay blank;
 * neither quoted labels nor individual records are converted to effects.
 */
export function approvedDatasetCsv(snapshot:ApprovedDatasetSnapshot):string{
 const heading=[
  'schema_version','snapshot_sha256','claim_id','series_id','revision','variant_id','therapy',
  'reference_id','reference_title','reference_url','pmid','doi','study_family_id',
  'scope','genotype_a','genotype_b','method','finding','source_locator','review_count',
  'reviewed_at','endpoint_code','endpoint_statistic','endpoint_value','endpoint_unit',
  'endpoint_model','endpoint_comparator','endpoint_timepoint','readiness','context_key','quality_flags'
 ];
 const rows=assessApprovedDataset(snapshot).rows;
 return [heading.map(csvCell).join(','),...rows.map(({record:r,readiness,contextKey,flags})=>[
  1,snapshot.snapshotSha256,r.claimId,r.seriesId,r.revision,r.variantId,r.therapy,
  r.referenceId,r.referenceTitle,r.referenceUrl,r.referencePmid,r.referenceDoi,r.studyFamilyId,
  r.scope,r.genotypePair?.[0]??null,r.genotypePair?.[1]??null,r.method,r.finding,r.locator,2,
  r.reviewedAt,r.endpoint?.code??null,r.endpoint?.statistic??null,r.endpoint?.value??null,
  r.endpoint?.unit??null,r.endpoint?.model??null,r.endpoint?.comparator??null,
  r.endpoint?.timepoint??null,readiness,contextKey,flags.join('; ')
 ].map(csvCell).join(','))].join('\r\n');
}
export function approvedDatasetJson(snapshot:ApprovedDatasetSnapshot):string{
 const quality=assessApprovedDataset(snapshot);
 return JSON.stringify({
  manifest:{
   source:snapshot.source,schemaVersion:snapshot.schemaVersion,
   snapshotSha256:snapshot.snapshotSha256,generatedAt:snapshot.generatedAt,
   total:snapshot.total,independentStudyFamilies:quality.independentStudyFamilies,
   numericEndpointRows:quality.numeric,contextBoundedRows:quality.contextBounded,
   limitations:snapshot.limitations,
   caveat:'Source-approved research observations; no inferred effects, no clinical prediction.'
  },
  records:quality.rows.map(({record,readiness,contextKey,flags})=>({
   ...record,readiness,contextKey,qualityFlags:flags
  }))
 },null,2);
}
export function createApprovedDatasetService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const endpoint=validateReadOnlyConfig(config);
 return Object.freeze({
  async snapshot(signal?:AbortSignal):Promise<ApprovedDatasetSnapshot>{
   const token=await session.getAccessToken();
   if(!token||token===config.publishableKey||!bearerPattern.test(token))
    throw new VariantConnectionError('authentication-required','Active research session required');
   let response:Response;
   try{
    response=await transport(new URL('/rest/v1/rpc/nfq_approved_research_dataset',endpoint).toString(),{
     method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      Accept:'application/json','content-type':'application/json'},
     body:'{}',credentials:'omit',cache:'no-store',redirect:'error',signal
    });
   }catch(error){
    if(signal?.aborted)throw error;
    throw new VariantConnectionError('request-failed','Approved research export unavailable');
   }
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Request cancelled');
   if(response.status===401||response.status===403)
    throw new VariantConnectionError('access-denied','Current research membership required');
   if(!response.ok)throw new VariantConnectionError('request-failed','Approved source snapshot could not be retrieved');
   let payload:unknown;
   try{payload=await response.json();}catch{
    throw new VariantConnectionError('schema-mismatch','Unreadable evidence snapshot');
   }
   return decodeApprovedDataset(payload);
  }
 });
}
