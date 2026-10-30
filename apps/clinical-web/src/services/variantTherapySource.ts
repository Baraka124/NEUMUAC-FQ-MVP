import {validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';
import {projectVariantTherapies,type RecordedResponse,type VariantTherapyProfile} from '../domain/therapyRegistry';

const exactId=/^[1-9]\d{0,17}$/;
const columns='id,cftr_class,class_subtype,validation_count,eti_prediction,alyftrek_prediction,eti_evidence_level,alyftrek_evidence_level,eti_evidence_tier,alyftrek_evidence_tier,eti_authority_source,alyftrek_authority_source';
function record(input:unknown):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw new VariantConnectionError('schema-mismatch','Invalid therapy record');
 return input as Record<string,unknown>;
}
function optionalText(row:Record<string,unknown>,field:string,max=1200):string|null{
 if(!Object.hasOwn(row,field))throw new VariantConnectionError('schema-mismatch','Missing therapy field '+field);
 const val=row[field];
 if(val===null)return null;
 if(typeof val!=='string'||val.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid therapy field '+field);
 return val.trim()||null;
}
function response(row:Record<string,unknown>,field:string):RecordedResponse{
 const value=optionalText(row,field,40);
 if(value===null)return null;
 if(value!=='responsive'&&value!=='non_responsive'&&value!=='unknown')
  throw new VariantConnectionError('schema-mismatch','Unrecognized therapy response');
 return value;
}
export function decodeVariantTherapyProfile(input:unknown):VariantTherapyProfile {
 const row=record(input);
 const id=typeof row.id==='number'&&Number.isSafeInteger(row.id)&&row.id>0?String(row.id):
   typeof row.id==='string'&&exactId.test(row.id)?row.id:null;
 if(!id)throw new VariantConnectionError('schema-mismatch','Invalid variant identifier');
 const validationCount=row.validation_count===null?null:row.validation_count;
 if(!Object.hasOwn(row,'validation_count')||
    (validationCount!==null&&(typeof validationCount!=='number'||!Number.isSafeInteger(validationCount)||validationCount<0)))
  throw new VariantConnectionError('schema-mismatch','Invalid validation count');
 return projectVariantTherapies({
  id,
  functionalClass:optionalText(row,'cftr_class',32),
  classSubtype:optionalText(row,'class_subtype',64),
  validationCount:validationCount as number|null,
  eti:response(row,'eti_prediction'),alyftrek:response(row,'alyftrek_prediction'),
  etiEvidenceLevel:optionalText(row,'eti_evidence_level'),
  alyftrekEvidenceLevel:optionalText(row,'alyftrek_evidence_level'),
  etiEvidenceTier:optionalText(row,'eti_evidence_tier'),
  alyftrekEvidenceTier:optionalText(row,'alyftrek_evidence_tier'),
  etiAuthority:optionalText(row,'eti_authority_source'),
  alyftrekAuthority:optionalText(row,'alyftrek_authority_source')
 });
}
export function createVariantTherapySource(config:ReadOnlyConfig,transport:typeof fetch=fetch,session?:ReadSessionProvider){
 const root=validateReadOnlyConfig(config);
 return Object.freeze({
  async get(id:string,signal?:AbortSignal):Promise<VariantTherapyProfile|null>{
   if(!exactId.test(id))return null;
   const url=new URL('/rest/v1/variants',root);
   url.search=new URLSearchParams({select:columns,id:'eq.'+id,limit:'2'}).toString();
   const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
   const mode=config.accessMode??'anonymous';
   if(mode==='authenticated'){
    if(!session)throw new VariantConnectionError('authentication-required','A staff session is required');
    const token=await session.getAccessToken();
    if(!token||token===config.publishableKey||!/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
     throw new VariantConnectionError('authentication-required','A valid staff session is required');
    headers.Authorization='Bearer '+token;
   }else if(mode==='anonymous'){
    if(!config.publishableKey.startsWith('sb_publishable_'))headers.Authorization='Bearer '+config.publishableKey;
   }else throw new VariantConnectionError('invalid-configuration','Unknown access mode');
   let res:Response;
   try{res=await transport(url.toString(),{method:'GET',headers,signal,cache:'no-store',credentials:'omit',redirect:'error'});}
   catch(e){if(signal?.aborted)throw e;throw new VariantConnectionError('request-failed','Therapy data unavailable');}
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Therapy read cancelled');
   if(res.status===401||res.status===403)throw new VariantConnectionError('access-denied','Therapy data access denied');
   if(!res.ok)throw new VariantConnectionError('request-failed','Therapy data unavailable');
   let data:unknown;
   try{data=await res.json();}catch{throw new VariantConnectionError('schema-mismatch','Therapy read result is invalid');}
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Therapy read cancelled');
   if(!Array.isArray(data)||data.length>1)
    throw new VariantConnectionError('schema-mismatch','Expected at most one therapy profile');
   if(!data.length)return null;
   const result=decodeVariantTherapyProfile(data[0]);
   if(result.variantId!==id)throw new VariantConnectionError('schema-mismatch','Therapy variant identity mismatch');
   return result;
  }
 });
}
