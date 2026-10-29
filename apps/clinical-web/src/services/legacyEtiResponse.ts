import {validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';

/**
 * NFQ-015 historical ETI response projection. All fields are literal values
 * already recorded in public.variants. They are NOT clinical response
 * determinations, validated treatment indications or drug recommendations.
 */
export type LegacyEtiCategory='responsive'|'non_responsive'|'unknown';
export interface LegacyEtiRecord {
 readonly id:string;
 readonly recordedEtiCategory:LegacyEtiCategory|null;
 readonly legacyTherapyFlag:boolean|null;
 readonly recordedEvidenceLevel:string|null;
 readonly recordedEvidenceTier:string|null;
 readonly recordedAuthority:string|null;
 readonly recordedCftr2Response:string|null;
 readonly lastEvidenceUpdate:string|null;
}
const columns='id,eti_prediction,therapy_responsive,eti_evidence_level,eti_evidence_tier,eti_authority_source,cftr2_eti_response,last_evidence_update';
const idPattern=/^[1-9]\d{0,17}$/;

function optionalText(value:unknown,field:string,max=220):string|null{
 if(value===null)return null;
 if(typeof value!=='string'||value.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid recorded ETI '+field);
 return value.trim()||null;
}
export function decodeLegacyEtiRecord(value:unknown):LegacyEtiRecord{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new VariantConnectionError('schema-mismatch','Unexpected legacy ETI record');
 const x=value as Record<string,unknown>;
 const id=typeof x.id==='number'&&Number.isSafeInteger(x.id)&&x.id>0?String(x.id):
   typeof x.id==='string'&&idPattern.test(x.id)?x.id:null;
 if(!id||!Object.hasOwn(x,'eti_prediction')||!Object.hasOwn(x,'therapy_responsive'))
  throw new VariantConnectionError('schema-mismatch','Legacy ETI identity or response fields missing');
 const category=optionalText(x.eti_prediction,'category',35);
 if(category!==null&&!(['responsive','non_responsive','unknown'] as const).includes(category as LegacyEtiCategory))
  throw new VariantConnectionError('schema-mismatch','Unrecognized historical ETI category');
 if(x.therapy_responsive!==null&&typeof x.therapy_responsive!=='boolean')
  throw new VariantConnectionError('schema-mismatch','Invalid legacy therapy response flag');
 const date=optionalText(x.last_evidence_update,'update date',10);
 if(date && (!/^\d{4}-\d{2}-\d{2}$/.test(date)||
   Number.isNaN(Date.parse(date+'T00:00:00Z'))||
   new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date))
  throw new VariantConnectionError('schema-mismatch','Invalid recorded evidence date');
 return Object.freeze({
  id,recordedEtiCategory:category as LegacyEtiCategory|null,
  legacyTherapyFlag:x.therapy_responsive as boolean|null,
  recordedEvidenceLevel:optionalText(x.eti_evidence_level,'evidence level'),
  recordedEvidenceTier:optionalText(x.eti_evidence_tier,'evidence tier'),
  recordedAuthority:optionalText(x.eti_authority_source,'authority source'),
  recordedCftr2Response:optionalText(x.cftr2_eti_response,'CFTR2 response'),
  lastEvidenceUpdate:date
 });
}

/** Display recorded terminology without promoting legacy codes to medical truth. */
export function recordedEtiLabel(value:LegacyEtiRecord['recordedEtiCategory']):string{
 if(value==='responsive')return 'Responsive · recorded legacy label';
 if(value==='non_responsive')return 'Non-responsive · recorded legacy label';
 if(value==='unknown')return 'Unknown · recorded legacy label';
 return 'No recorded ETI category';
}
export function recordedTherapyFlag(value:boolean|null):string{
 return value===true?'Yes · historical flag':value===false?'No · historical flag':'Not recorded';
}

export function createLegacyEtiSource(config:ReadOnlyConfig,transport:typeof fetch=fetch,session?:ReadSessionProvider){
 const root=validateReadOnlyConfig(config);
 return Object.freeze({
  async get(id:string,signal?:AbortSignal):Promise<LegacyEtiRecord|null>{
   if(!idPattern.test(id))return null;
   const url=new URL('/rest/v1/variants',root);
   url.search=new URLSearchParams({select:columns,id:'eq.'+id,limit:'2'}).toString();
   const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
   const mode=config.accessMode??'anonymous';
   if(mode==='authenticated'){
    if(!session)throw new VariantConnectionError('authentication-required','Staff session required');
    const jwt=await session.getAccessToken();
    if(!jwt||jwt===config.publishableKey||
       !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(jwt))
     throw new VariantConnectionError('authentication-required','Signed-in staff session required');
    headers.Authorization='Bearer '+jwt;
   }else if(mode==='anonymous'){
    if(!config.publishableKey.startsWith('sb_publishable_'))
     headers.Authorization='Bearer '+config.publishableKey;
   }else throw new VariantConnectionError('invalid-configuration','Unexpected access mode');
   let response:Response;
   try{
    response=await transport(url.toString(),{method:'GET',headers,signal,cache:'no-store',credentials:'omit',redirect:'error'});
   }catch(error){
    if(signal?.aborted)throw error;
    throw new VariantConnectionError('request-failed','Legacy response register is unavailable');
   }
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Legacy response retrieval cancelled');
   if(response.status===401||response.status===403)
    throw new VariantConnectionError('access-denied','Legacy ETI read access denied');
   if(!response.ok)throw new VariantConnectionError('request-failed','Legacy ETI read failed');
   let body:unknown;
   try{body=await response.json();}
   catch{throw new VariantConnectionError('schema-mismatch','Legacy ETI response unreadable');}
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Legacy response retrieval cancelled');
   if(!Array.isArray(body)||body.length>1)
    throw new VariantConnectionError('schema-mismatch','Invalid legacy ETI read result');
   if(!body.length)return null;
   const record=decodeLegacyEtiRecord(body[0]);
   if(record.id!==id)throw new VariantConnectionError('schema-mismatch','Legacy ETI record identity mismatch');
   return record;
  }
 });
}
