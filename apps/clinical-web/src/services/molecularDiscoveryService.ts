import {validateReadOnlyConfig,VariantConnectionError,
 type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';
import {MECHANISM_CATEGORIES,type MechanismCategory,
 type MechanismInterpretation} from '../domain/mechanismAnnotationDraft';
import {THERAPIES,type CoreModulatorId} from '../domain/therapyRegistry';

/** Only independently approved molecular interpretations linked to their
 * independently approved original source are discoverable. No prevalence,
 * mechanism equivalence or predicted treatment effect is calculated. */
export interface MolecularDiscoveryEntry {
 readonly id:string;
 readonly seriesId:string;
 readonly revision:number;
 readonly variantId:string;
 readonly sourceClaimId:string;
 readonly categories:readonly MechanismCategory[];
 readonly interpretation:MechanismInterpretation;
 readonly statement:string;
 readonly exactLocator:string;
 readonly experimentalContext:string;
 readonly limitations:string;
 readonly submittedAt:string;
 readonly referenceId:number;
 readonly studyFamilyId:string;
 readonly therapy:CoreModulatorId;
 readonly sourceTitle:string;
 readonly sourceUrl:string;
 readonly legacyName:string|null;
 readonly cdnaName:string|null;
 readonly proteinName:string|null;
 readonly recordedClass:string|null;
}
export interface MolecularDiscoveryPage{
 readonly entries:readonly MolecularDiscoveryEntry[];
 readonly category:MechanismCategory|null;
 readonly variantId:string|null;
 readonly limit:number;
 readonly offset:number;
 readonly hasMore:boolean;
 readonly scope:'independently-reviewed-research-only';
}
const validId=/^[1-9][0-9]{0,17}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const categories=new Set<string>(MECHANISM_CATEGORIES.map(x=>x.id));
const therapies=new Set<string>(THERAPIES.map(x=>x.id));
const interpretations=new Set(['reported-observation','mechanistic-hypothesis','contradictory-or-uncertain']);
const str=(value:unknown,min=1,max=900):value is string=>typeof value==='string'&&
 value.length>=min&&value.length<=max&&value.trim()===value&&!/[\u0000-\u001f\u007f]/.test(value);
function obj(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=='object'||Array.isArray(value))
  throw new VariantConnectionError('schema-mismatch','Invalid molecular discovery response');
 return value as Record<string,unknown>;
}
export function decodeMolecularDiscoveryPage(
 raw:unknown,selection:{category:MechanismCategory|null;variantId:string|null;limit:number;offset:number}
):MolecularDiscoveryPage{
 const data=obj(raw);
 if(data.source!=='nfq-approved-molecular-discovery-v1'||
  data.category!==selection.category||data.variantId!==selection.variantId||
  data.limit!==selection.limit||data.offset!==selection.offset||
  typeof data.hasMore!=='boolean'||!Array.isArray(data.records)||
  data.records.length>selection.limit)
  throw new VariantConnectionError('schema-mismatch','Incomplete or mismatched discovery page');
 const entries:MolecularDiscoveryEntry[]=data.records.map((item:unknown)=>{
  const row=obj(item);
  if(!uuid.test(String(row.id))||!uuid.test(String(row.seriesId))||
   !uuid.test(String(row.sourceClaimId))||!validId.test(String(row.variantId))||
   !Number.isSafeInteger(row.revision)||Number(row.revision)<1||Number(row.revision)>100||
   !Array.isArray(row.categories)||row.categories.length<1||row.categories.length>5||
   row.categories.some(x=>!categories.has(String(x)))||
   new Set(row.categories).size!==row.categories.length||
   (selection.category!==null&&!row.categories.includes(selection.category))||
   (selection.variantId!==null&&row.variantId!==selection.variantId)||
   !interpretations.has(String(row.interpretation))||
   !str(row.statement,25,850)||!str(row.exactLocator,8,240)||
   !str(row.experimentalContext,15,350)||!str(row.limitations,20,500)||
   !str(row.submittedAt,10,64)||!Number.isFinite(Date.parse(row.submittedAt))||
   typeof row.referenceId!=='number'||!Number.isSafeInteger(row.referenceId)||row.referenceId<1||
   !str(row.studyFamilyId,1,120)||!therapies.has(String(row.therapy))||
   !str(row.sourceTitle,1,500)||!str(row.sourceUrl,8,2000)||
   !/^https?:\/\//i.test(row.sourceUrl)||
   [row.legacyName,row.cdnaName,row.proteinName,row.recordedClass].some(
    value=>value!==null&&!str(value,1,300)))
   throw new VariantConnectionError('schema-mismatch','Invalid approved molecular provenance');
  return Object.freeze({
   id:row.id as string,seriesId:row.seriesId as string,revision:row.revision as number,
   variantId:row.variantId as string,sourceClaimId:row.sourceClaimId as string,
   categories:Object.freeze([...row.categories]) as readonly MechanismCategory[],
   interpretation:row.interpretation as MechanismInterpretation,
   statement:row.statement as string,exactLocator:row.exactLocator as string,
   experimentalContext:row.experimentalContext as string,limitations:row.limitations as string,
   submittedAt:row.submittedAt as string,referenceId:row.referenceId as number,
   studyFamilyId:row.studyFamilyId as string,therapy:row.therapy as CoreModulatorId,
   sourceTitle:row.sourceTitle as string,sourceUrl:row.sourceUrl as string,
   legacyName:row.legacyName as string|null,cdnaName:row.cdnaName as string|null,
   proteinName:row.proteinName as string|null,recordedClass:row.recordedClass as string|null
  });
 });
 if(new Set(entries.map(x=>x.id)).size!==entries.length||
  new Set(entries.map(x=>x.seriesId)).size!==entries.length)
  throw new VariantConnectionError('schema-mismatch','Duplicate molecular discovery identities');
 if(data.hasMore&&entries.length!==selection.limit)
  throw new VariantConnectionError('schema-mismatch','Noncontiguous discovery pagination');
 return Object.freeze({
  entries:Object.freeze(entries),category:selection.category,variantId:selection.variantId,
  limit:selection.limit,offset:selection.offset,hasMore:data.hasMore as boolean,
  scope:'independently-reviewed-research-only' as const
 });
}
export function createMolecularDiscoveryService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 return Object.freeze({
  async search(selection:{
   category:MechanismCategory|null;variantId:string|null;limit?:number;offset?:number
  },signal?:AbortSignal):Promise<MolecularDiscoveryPage>{
   const limit=selection.limit??20,offset=selection.offset??0;
   if(selection.category!==null&&!categories.has(selection.category)||
    selection.variantId!==null&&!validId.test(selection.variantId)||
    !Number.isSafeInteger(limit)||limit<1||limit>30||
    !Number.isSafeInteger(offset)||offset<0||offset>5000)
    throw new VariantConnectionError('invalid-configuration','Invalid molecular discovery filter');
   const token=await session.getAccessToken();
   if(!token||token===config.publishableKey||
    !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
    throw new VariantConnectionError('authentication-required','Verified research session required');
   const url=new URL('/rest/v1/rpc/nfq_molecular_evidence_discovery',root);
   let response:Response;
   try{
    response=await transport(url.toString(),{
     method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
      'content-type':'application/json',Accept:'application/json'},
     body:JSON.stringify({p_category:selection.category,p_variant_id:selection.variantId,
      p_limit:limit,p_offset:offset}),
     credentials:'omit',cache:'no-store',redirect:'error',signal
    });
   }catch(e){
    if(signal?.aborted)throw e;
    throw new VariantConnectionError('request-failed','Molecular discovery unavailable');
   }
   if(signal?.aborted)throw new VariantConnectionError('request-failed','Discovery cancelled');
   if(response.status===401||response.status===403)
    throw new VariantConnectionError('access-denied','Active research membership required');
   if(!response.ok)throw new VariantConnectionError('request-failed','Approved molecular evidence could not be verified');
   let raw:unknown;
   try{raw=await response.json();}
   catch{throw new VariantConnectionError('schema-mismatch','Unverified molecular discovery response');}
   return decodeMolecularDiscoveryPage(raw,{category:selection.category,variantId:selection.variantId,
    limit,offset});
  }
 });
}
