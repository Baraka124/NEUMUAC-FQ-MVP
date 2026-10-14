import {validateReadOnlyConfig,type ReadOnlyConfig,VariantConnectionError,type RealVariant} from './liveVariants';
export interface CoverageRow{variant:RealVariant;links:number}
export interface CoverageReport{variants:readonly CoverageRow[];totalLinks:number;linkedVariants:number;bySource:readonly {name:string;count:number}[]}
const PAGE=1000;
async function getAll<T>(config:ReadOnlyConfig,table:'variants'|'evidence_links',columns:string,parse:(x:unknown)=>T,signal?:AbortSignal):Promise<T[]>{
 const root=validateReadOnlyConfig(config);const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
 if(!config.publishableKey.startsWith('sb_publishable_'))headers.Authorization='Bearer '+config.publishableKey;
 const result:T[]=[];
 for(let page=0;page<100;page++){
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const url=new URL('/rest/v1/'+table,root);
  url.search=new URLSearchParams({select:columns,order:'id.asc',limit:String(PAGE),offset:String(page*PAGE)}).toString();
  const resp=await fetch(url.toString(),{method:'GET',headers,cache:'no-store',credentials:'omit',signal});
  if(!resp.ok)throw new VariantConnectionError(resp.status===401||resp.status===403?'access-denied':'request-failed','Live coverage read unavailable');
  const body:unknown=await resp.json();
  if(!Array.isArray(body))throw new VariantConnectionError('schema-mismatch','Unexpected coverage response');
  result.push(...body.map(parse));
  if(body.length<PAGE)return result;
 }
 throw new VariantConnectionError('request-failed','Coverage limit reached; report is incomplete.');
}
export async function loadLiveCoverage(config:ReadOnlyConfig,signal?:AbortSignal):Promise<CoverageReport>{
 const {decodeRealVariant}=await import('./liveVariants');
 const variants=await getAll(config,'variants','id,legacy_name,protein_name,cdna_name,alt_names',decodeRealVariant,signal);
 const evidence=await getAll(config,'evidence_links','id,variant_id,source',x=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw new VariantConnectionError('schema-mismatch','Invalid evidence');
  const v=x as Record<string,unknown>;
  if(typeof v.id!=='number'||typeof v.variant_id!=='number')throw new VariantConnectionError('schema-mismatch','Invalid evidence link');
  return {id:v.id,variantId:String(v.variant_id),source:typeof v.source==='string'&&v.source.trim()?v.source:'Unspecified source'};
 },signal);
 const counts=new Map<string,number>();
 const sources=new Map<string,number>();
 for(const link of evidence){counts.set(link.variantId,(counts.get(link.variantId)||0)+1);sources.set(link.source,(sources.get(link.source)||0)+1);}
 const ids=new Set(variants.map(v=>v.id));
 if(ids.size!==variants.length||evidence.some(e=>!ids.has(e.variantId)))throw new VariantConnectionError('schema-mismatch','Coverage data references missing variants');
 return {variants:variants.map(variant=>({variant,links:counts.get(variant.id)||0})),totalLinks:evidence.length,linkedVariants:counts.size,bySource:[...sources].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count)};
}
