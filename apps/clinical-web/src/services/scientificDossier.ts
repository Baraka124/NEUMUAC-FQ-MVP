import {validateReadOnlyConfig,type ReadOnlyConfig,VariantConnectionError} from './liveVariants';
export interface ScientificDossier{
  id:string; functionalClass:string|null; subtype:string|null; confidence:string|null;
  recordedDetermination:string|null; sourceSummary:string|null; dataStatus:string|null;
  validationCount:number|null; lastValidatedAt:string|null; lastEvidenceUpdate:string|null; clinvarId:string|null;
}
const columns='id,cftr_class,class_subtype,class_confidence,final_determination,source_summary,data_status,validation_count,last_validated_at,last_evidence_update,clinvar_id';
export function decodeScientificDossier(input:unknown):ScientificDossier{
 if(!input||typeof input!=='object'||Array.isArray(input))throw new VariantConnectionError('schema-mismatch','Invalid scientific profile');
 const x=input as Record<string,unknown>;
 if((typeof x.id!=='number'||!Number.isSafeInteger(x.id)||x.id<=0)&&
    !(typeof x.id==='string'&&/^[1-9]\d{0,17}$/.test(x.id)))
    throw new VariantConnectionError('schema-mismatch','Scientific profile identifier missing');
 const field=(n:string)=>typeof x[n]==='string'&&String(x[n]).trim()?String(x[n]).trim():null;
 return {id:String(x.id),functionalClass:field('cftr_class'),subtype:field('class_subtype'),
 confidence:field('class_confidence'),recordedDetermination:field('final_determination'),
 sourceSummary:field('source_summary'),dataStatus:field('data_status'),
 validationCount:typeof x.validation_count==='number'&&Number.isSafeInteger(x.validation_count)?x.validation_count:null,
 lastValidatedAt:field('last_validated_at'),lastEvidenceUpdate:field('last_evidence_update'),clinvarId:field('clinvar_id')};
}
export function createScientificDossierSource(config:ReadOnlyConfig,transport:typeof fetch=fetch){
 const root=validateReadOnlyConfig(config);
 const headers:Record<string,string>={apikey:config.publishableKey,Accept:'application/json'};
 if(!config.publishableKey.startsWith('sb_publishable_'))headers.Authorization='Bearer '+config.publishableKey;
 return Object.freeze({
  async get(id:string,signal?:AbortSignal):Promise<ScientificDossier|null>{
    if(!/^[1-9]\d{0,17}$/.test(id))return null;
    const url=new URL('/rest/v1/variants',root);
    url.search=new URLSearchParams({select:columns,id:'eq.'+id,limit:'2'}).toString();
    let r:Response;
    try{r=await transport(url.toString(),{method:'GET',headers,credentials:'omit',cache:'no-store',redirect:'error',signal});}
    catch(e){if(signal?.aborted)throw e;throw new VariantConnectionError('request-failed','Scientific fields unavailable');}
    if(!r.ok)throw new VariantConnectionError(r.status===403?'access-denied':'request-failed','Scientific fields unavailable');
    const rows:unknown=await r.json();
    if(!Array.isArray(rows))throw new VariantConnectionError('schema-mismatch','Unexpected scientific profile response');
    if(rows.length>1)throw new VariantConnectionError('schema-mismatch','Multiple scientific profiles returned for one variant.');
    if(!rows.length)return null;
    const result=decodeScientificDossier(rows[0]);
    if(result.id!==id)throw new VariantConnectionError('schema-mismatch','Scientific profile does not match the requested variant.');
    return result;
  }
 });
}
