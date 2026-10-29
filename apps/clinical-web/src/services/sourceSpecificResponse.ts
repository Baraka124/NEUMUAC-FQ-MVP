import {validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';

/** NFQ-015/026: literal legacy variant_evidence + evidence_sources projection.
 * Source metadata is not a validated research reference. Neither source_type
 * nor response labels establish treatment efficacy, indication, or methodology.
 * This adapter performs only exact-variant GET requests. No clinical notes,
 * contributor identities, roles, privileged credentials or browser writes.
 */
export type RecordedModulatorResponse='responsive'|'non_responsive'|'unknown'|'mixed'|'inconclusive'|null;
export interface ResponseSourceMetadata{
 readonly id:string;
 readonly key:string;
 readonly name:string;
 readonly type:string;
 readonly year:number|null;
 readonly url:string|null;
 readonly active:boolean|null;
}
export interface SourceSpecificResponse{
 readonly id:string;
 readonly variantId:string;
 readonly sourceId:string;
 readonly eti:RecordedModulatorResponse;
 readonly alyftrek:RecordedModulatorResponse;
 readonly confidence:string|null;
 readonly sampleSize:number|null;
 readonly recordedAt:string|null;
 readonly source:ResponseSourceMetadata;
}
const identifier=/^[1-9]\d{0,17}$/;
const maxRows=30;
const evidenceSelect='id,variant_id,source_id,eti_response,alyftrek_response,confidence,sample_size,created_at';
const sourceSelect='id,source_key,display_name,source_type,year,url,is_active';

function object(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new VariantConnectionError('schema-mismatch','Unexpected source-specific response row');
 return value as Record<string,unknown>;
}
function id(value:unknown):string{
 const result=typeof value==='number'&&Number.isSafeInteger(value)&&value>0?String(value):
   typeof value==='string'&&identifier.test(value)?value:null;
 if(!result)throw new VariantConnectionError('schema-mismatch','Invalid response record identity');
 return result;
}
function required(value:unknown,name:string,max=180):string{
 if(typeof value!=='string'||!value.trim()||value.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid source '+name);
 return value.trim();
}
function optional(value:unknown,name:string,max=180):string|null{
 if(value===null)return null;
 if(typeof value!=='string'||value.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid '+name);
 return value.trim()||null;
}
function recordedResponse(value:unknown):RecordedModulatorResponse{
 const result=optional(value,'recorded response',30);
 if(result===null)return null;
 if(!(['responsive','non_responsive','unknown','mixed','inconclusive'] as string[]).includes(result))
  throw new VariantConnectionError('schema-mismatch','Unrecognized source-specific response code');
 return result as RecordedModulatorResponse;
}
function safeUrl(value:unknown):string|null{
 if(value===null)return null;
 if(typeof value!=='string'||value.length>2048)
  throw new VariantConnectionError('schema-mismatch','Malformed source URL');
 if(!value.trim())return null;
 let url:URL;
 try{url=new URL(value)}catch{throw new VariantConnectionError('schema-mismatch','Malformed source URL')}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash||
    !['doi.org','pubmed.ncbi.nlm.nih.gov','www.ema.europa.eu','www.fda.gov','cftr2.org','www.cftr2.org'].includes(url.hostname.toLowerCase()))
  throw new VariantConnectionError('schema-mismatch','Unapproved source URL');
 return url.toString();
}
export function decodeResponseSource(value:unknown):ResponseSourceMetadata{
 const x=object(value);
 const year=x.year===null?null:x.year;
 if(year!==null&&(typeof year!=='number'||!Number.isInteger(year)||year<1900||year>2100))
  throw new VariantConnectionError('schema-mismatch','Invalid recorded publication year');
 if(x.is_active!==null&&typeof x.is_active!=='boolean')
  throw new VariantConnectionError('schema-mismatch','Invalid source activity flag');
 return Object.freeze({
  id:id(x.id),key:required(x.source_key,'key'),
  name:required(x.display_name,'name'),
  type:required(x.source_type,'type'),
  year:year as number|null,url:safeUrl(x.url),
  active:x.is_active as boolean|null
 });
}
interface ResponseRow {
 readonly id:string;readonly variantId:string;readonly sourceId:string;
 readonly eti:RecordedModulatorResponse;readonly alyftrek:RecordedModulatorResponse;
 readonly confidence:string|null;readonly sampleSize:number|null;readonly recordedAt:string|null;
}
export function decodeResponseRow(value:unknown):ResponseRow{
 const x=object(value);
 const sample=x.sample_size===null?null:x.sample_size;
 if(sample!==null&&(typeof sample!=='number'||!Number.isSafeInteger(sample)||sample<0))
  throw new VariantConnectionError('schema-mismatch','Invalid recorded sample size');
 return Object.freeze({
  id:id(x.id),variantId:id(x.variant_id),sourceId:id(x.source_id),
  eti:recordedResponse(x.eti_response),alyftrek:recordedResponse(x.alyftrek_response),
  confidence:optional(x.confidence,'confidence',100),
  sampleSize:sample as number|null,
  recordedAt:optional(x.created_at,'record timestamp',50)
 });
}
export function responseLabel(value:RecordedModulatorResponse):string{
 if(value===null)return 'Not recorded';
 if(value==='non_responsive')return 'Non-responsive · source label';
 return value.slice(0,1).toUpperCase()+value.slice(1).replaceAll('_',' ')+' · source label';
}
export function createSourceSpecificResponseSource(
 config:ReadOnlyConfig,transport:typeof fetch=fetch,session?:ReadSessionProvider
){
 const root=validateReadOnlyConfig(config);
 return Object.freeze({
  async get(variantId:string,signal?:AbortSignal):Promise<readonly SourceSpecificResponse[]>{
   if(!identifier.test(variantId))return [];
   const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
   if((config.accessMode??'anonymous')==='authenticated'){
    if(!session)throw new VariantConnectionError('authentication-required','Staff session unavailable');
    const token=await session.getAccessToken();
    if(!token||token===config.publishableKey||
       !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
     throw new VariantConnectionError('authentication-required','Signed-in staff session required');
    headers.Authorization='Bearer '+token;
   }else if((config.accessMode??'anonymous')==='anonymous'){
    if(!config.publishableKey.startsWith('sb_publishable_'))
     headers.Authorization='Bearer '+config.publishableKey;
   }else throw new VariantConnectionError('invalid-configuration','Unknown read mode');
   async function read(path:string,params:URLSearchParams):Promise<unknown[]>{
    const url=new URL('/rest/v1/'+path,root);
    url.search=params.toString();
    let response:Response;
    try{response=await transport(url.toString(),{method:'GET',headers,signal,credentials:'omit',cache:'no-store',redirect:'error'})}
    catch(e){if(signal?.aborted)throw e;throw new VariantConnectionError('request-failed','Recorded source data unavailable')}
    if(signal?.aborted)throw new VariantConnectionError('request-failed','Response read cancelled');
    if(response.status===401||response.status===403)
     throw new VariantConnectionError('access-denied','Recorded source access denied');
    if(!response.ok)throw new VariantConnectionError('request-failed','Recorded source read failed');
    let payload:unknown;
    try{payload=await response.json()}
    catch{throw new VariantConnectionError('schema-mismatch','Unreadable source response')}
    if(signal?.aborted)throw new VariantConnectionError('request-failed','Response read cancelled');
    if(!Array.isArray(payload)||payload.length>maxRows)
     throw new VariantConnectionError('schema-mismatch','Unbounded source response');
    return payload;
   }
   const base=await read('variant_evidence',new URLSearchParams({
    select:evidenceSelect,variant_id:'eq.'+variantId,order:'id.asc',limit:String(maxRows+1)
   }));
   const rows=base.map(decodeResponseRow);
   if(rows.some(x=>x.variantId!==variantId)||new Set(rows.map(x=>x.id)).size!==rows.length)
    throw new VariantConnectionError('schema-mismatch','Source response identifier conflict');
   if(!rows.length)return Object.freeze([]);
   const ids=[...new Set(rows.map(x=>x.sourceId))];
   const sourceRows=await read('evidence_sources',new URLSearchParams({
    select:sourceSelect,id:'in.('+ids.join(',')+')',limit:String(maxRows+1)
   }));
   const sources=sourceRows.map(decodeResponseSource);
   const lookup=new Map(sources.map(x=>[x.id,x]));
   if(lookup.size!==sources.length||lookup.size!==ids.length||sources.some(x=>!ids.includes(x.id)))
    throw new VariantConnectionError('schema-mismatch','Missing or mismatched source metadata');
   return Object.freeze(rows.map(row=>Object.freeze({...row,source:lookup.get(row.sourceId)!})));
  }
 });
}
