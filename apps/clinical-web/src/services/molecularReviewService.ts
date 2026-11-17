import {validateReadOnlyConfig,VariantConnectionError,
 type ReadOnlyConfig,type ReadSessionProvider} from './liveVariants';
import {MECHANISM_CATEGORIES,type MechanismCategory,type MechanismAnnotationDraft,
 type MechanismInterpretation} from '../domain/mechanismAnnotationDraft';

export type MolecularReviewStatus='pending'|'approved'|'rejected'|'withdrawn'|'superseded';
export interface MolecularReviewRecord{
 readonly id:string;
 readonly seriesId:string;
 readonly revision:number;
 readonly parentId:string|null;
 readonly variantId:string;
 readonly sourceClaimId:string;
 readonly categories:readonly MechanismCategory[];
 readonly interpretation:MechanismInterpretation;
 readonly statement:string;
 readonly exactLocator:string;
 readonly experimentalContext:string;
 readonly limitations:string;
 readonly status:MolecularReviewStatus;
 readonly submittedAt:string;
 readonly submittedByMe:boolean;
 readonly canReview:boolean;
 readonly reviewCount:number;
 readonly reviewSeals:readonly string[];
 readonly events:readonly {readonly action:string;readonly at:string}[];
}
const canonical=/^[1-9][0-9]{0,17}$/;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const approvals=new Set<MolecularReviewStatus>(['pending','approved','rejected','withdrawn','superseded']);
const categories=new Set<string>(MECHANISM_CATEGORIES.map(c=>c.id));
const interpretations=new Set<MechanismInterpretation>([
 'reported-observation','mechanistic-hypothesis','contradictory-or-uncertain']);
const actions=new Set(['submitted','revised','review-approved','review-rejected',
 'approved','rejected','superseded','withdrawn']);
const string=(v:unknown,min=1,max=900):v is string=>
 typeof v==='string'&&v.length>=min&&v.length<=max&&v.trim()===v&&
 !/[\u0000-\u001f\u007f]/.test(v);
const obj=(v:unknown):Record<string,unknown>=>{
 if(!v||typeof v!=='object'||Array.isArray(v))
  throw new VariantConnectionError('schema-mismatch','Invalid mechanism review response');
 return v as Record<string,unknown>;
};
export function decodeMolecularReviewRecords(raw:unknown,variantId:string):readonly MolecularReviewRecord[]{
 if(!canonical.test(variantId))throw new VariantConnectionError('invalid-configuration','Invalid molecular variant ID');
 const data=obj(raw);
 if(data.variantId!==variantId||data.source!=='nfq-independent-molecular-review-v1'||
  !Array.isArray(data.claims)||data.claims.length>200)
  throw new VariantConnectionError('schema-mismatch','Unverified mechanism review inventory');
 const result:MolecularReviewRecord[]=data.claims.map((item:unknown)=>{
  const c=obj(item);
  if(!uuid.test(String(c.id))||!uuid.test(String(c.seriesId))||
   c.variantId!==variantId||!uuid.test(String(c.sourceClaimId))||
   !Number.isSafeInteger(c.revision)||Number(c.revision)<1||Number(c.revision)>100||
   !(c.parentId===null||uuid.test(String(c.parentId)))||
   ((c.revision===1)!==(c.parentId===null))||
   !Array.isArray(c.categories)||c.categories.length<1||c.categories.length>5||
   c.categories.some(x=>typeof x!=='string'||!categories.has(x))||
   new Set(c.categories).size!==c.categories.length||
   !interpretations.has(c.interpretation as MechanismInterpretation)||
   !string(c.statement,25,850)||!string(c.exactLocator,8,240)||
   !string(c.experimentalContext,15,350)||!string(c.limitations,20,500)||
   !approvals.has(c.status as MolecularReviewStatus)||
   !string(c.submittedAt,10,64)||!Number.isFinite(Date.parse(c.submittedAt as string))||
   typeof c.submittedByMe!=='boolean'||typeof c.canReview!=='boolean'||
   !Number.isSafeInteger(c.reviewCount)||Number(c.reviewCount)<0||Number(c.reviewCount)>2||
   !Array.isArray(c.reviewSeals)||c.reviewSeals.length>2||
   c.reviewSeals.some(x=>typeof x!=='string'||!/^attestation:[0-9a-f-]{36}$/i.test(x))||
   (c.status==='approved'&&(c.reviewCount!==2||c.reviewSeals.length!==2||
    c.reviewSeals[0]===c.reviewSeals[1]))||
   (c.status!=='approved'&&c.reviewSeals.length!==0)||
   !Array.isArray(c.events)||c.events.length>100)
   throw new VariantConnectionError('schema-mismatch','Invalid molecular review record');
  const events=c.events.map((e:unknown)=>{
   const row=obj(e);
   if(!actions.has(row.action as string)||!string(row.at,10,64)||
    !Number.isFinite(Date.parse(row.at as string)))
    throw new VariantConnectionError('schema-mismatch','Invalid molecular audit event');
   return Object.freeze({action:row.action as string,at:row.at as string});
  });
  return Object.freeze({
   id:c.id as string,seriesId:c.seriesId as string,
   revision:c.revision as number,parentId:c.parentId as string|null,
   variantId,sourceClaimId:c.sourceClaimId as string,
   categories:Object.freeze([...c.categories]) as readonly MechanismCategory[],
   interpretation:c.interpretation as MechanismInterpretation,
   statement:c.statement as string,exactLocator:c.exactLocator as string,
   experimentalContext:c.experimentalContext as string,limitations:c.limitations as string,
   status:c.status as MolecularReviewStatus,submittedAt:c.submittedAt as string,
   submittedByMe:c.submittedByMe as boolean,canReview:c.canReview as boolean,
   reviewCount:c.reviewCount as number,reviewSeals:Object.freeze(c.reviewSeals as string[]),
   events:Object.freeze(events)
  });
 });
 if(new Set(result.map(c=>c.id)).size!==result.length||
  new Set(result.map(c=>c.seriesId+':'+c.revision)).size!==result.length)
  throw new VariantConnectionError('schema-mismatch','Duplicate molecular review revision');
 const current=new Set<string>();
 for(const row of result.filter(x=>x.status==='approved')){
  if(current.has(row.seriesId))
   throw new VariantConnectionError('schema-mismatch','Concurrent molecular approvals');
  current.add(row.seriesId);
 }
 return Object.freeze(result);
}
export function createMolecularReviewService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 async function request(action:'list'|'submit'|'revise'|'review',
  variantId:string,recordId:string|null,payload:unknown,
  revision:number|null,signal?:AbortSignal):Promise<unknown>{
  if(!canonical.test(variantId)||(recordId!==null&&!uuid.test(recordId))||
    (revision!==null&&(!Number.isSafeInteger(revision)||revision<1||revision>100)))
    throw new VariantConnectionError('invalid-configuration','Invalid molecular review request');
  const token=await session.getAccessToken();
  if(!token||token===config.publishableKey||
   !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
   throw new VariantConnectionError('authentication-required','Active research session required');
  const url=new URL('/rest/v1/rpc/nfq_molecular_mechanism_reviews',root);
  let response:Response;
  try{
   response=await transport(url.toString(),{
    method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
     'content-type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_action:action,p_variant_id:variantId,p_id:recordId,
     p_payload:payload,p_expected_revision:revision}),
    credentials:'omit',cache:'no-store',redirect:'error',signal
   });
  }catch(e){
   if(signal?.aborted)throw e;
   throw new VariantConnectionError('request-failed','Molecular review service unavailable');
  }
  if(signal?.aborted)throw new VariantConnectionError('request-failed','Molecular review request cancelled');
  if(response.status===401||response.status===403)
   throw new VariantConnectionError('access-denied','Current research role does not authorize the requested operation');
  if(!response.ok)
   throw new VariantConnectionError('request-failed','Molecular review operation was not confirmed');
  try{return await response.json();}
  catch{throw new VariantConnectionError('schema-mismatch','Unverified molecular review response');}
 }
 return Object.freeze({
  async list(variantId:string,signal?:AbortSignal):Promise<readonly MolecularReviewRecord[]>{
   return decodeMolecularReviewRecords(await request('list',variantId,null,null,null,signal),variantId);
  },
  async submit(draft:MechanismAnnotationDraft):Promise<string>{
   if(draft.validationState!=='unreviewed-research-draft'||!uuid.test(draft.claimId)||
    !canonical.test(draft.variantId))throw new VariantConnectionError('invalid-configuration','Invalid molecular proposal');
   const data=obj(await request('submit',draft.variantId,null,{
    sourceClaimId:draft.claimId,categories:draft.categories,
    interpretation:draft.interpretation,statement:draft.statement,
    exactLocator:draft.exactLocator,experimentalContext:draft.experimentalContext,
    limitations:draft.limitations
   },null));
   if(!uuid.test(String(data.id))||data.status!=='pending'||data.revision!==1)
    throw new VariantConnectionError('schema-mismatch','Molecular submission unconfirmed');
   return data.id as string;
  },
  async revise(record:MolecularReviewRecord,draft:MechanismAnnotationDraft):Promise<string>{
   if(record.variantId!==draft.variantId||record.sourceClaimId!==draft.claimId||
    !['approved','rejected'].includes(record.status))
    throw new VariantConnectionError('invalid-configuration','Incompatible molecular revision');
   const data=obj(await request('revise',draft.variantId,record.id,{
    sourceClaimId:draft.claimId,categories:draft.categories,
    interpretation:draft.interpretation,statement:draft.statement,
    exactLocator:draft.exactLocator,experimentalContext:draft.experimentalContext,
    limitations:draft.limitations
   },record.revision));
   if(!uuid.test(String(data.id))||data.status!=='pending'||data.revision!==record.revision+1)
    throw new VariantConnectionError('schema-mismatch','Molecular revision unconfirmed');
   return data.id as string;
  },
  async review(record:MolecularReviewRecord,decision:'approve'|'reject',note:string):
   Promise<{status:'pending'|'approved'|'rejected';reviewCount:number}>{
   if(!record.canReview||record.status!=='pending'||!string(note.trim(),20,900))
    throw new VariantConnectionError('invalid-configuration','Independent reviewer and rationale required');
   const data=obj(await request('review',record.variantId,record.id,{decision,note:note.trim()},record.revision));
   if(data.id!==record.id||!['pending','approved','rejected'].includes(String(data.status))||
    !Number.isSafeInteger(data.reviewCount)||Number(data.reviewCount)<0||
    Number(data.reviewCount)>2)
    throw new VariantConnectionError('schema-mismatch','Molecular review decision unconfirmed');
   return {status:data.status as 'pending'|'approved'|'rejected',reviewCount:data.reviewCount as number};
  }
 });
}
