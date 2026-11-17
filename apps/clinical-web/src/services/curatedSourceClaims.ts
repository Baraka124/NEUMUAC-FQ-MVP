import type {CoreModulatorId} from '../domain/therapyRegistry';
import {validResearchEndpoint,type ResearchEndpoint} from '../domain/researchEndpointNormalization';
import {validStudyStatistics,type ReportedStudyStatistics} from '../domain/reportedStudyStatistics';
import {validReportedStudyIdentity,type ReportedStudyIdentity} from '../domain/reportedStudyIdentity';
import type {
 DoubleReviewedSourceClaim,ResearchObservationMethod,ResearchObservationFinding,
 ResearchClaimScope
} from '../domain/sourceConflictReconciliation';
import {
 validateReadOnlyConfig,VariantConnectionError,type ReadOnlyConfig,type ReadSessionProvider
} from './liveVariants';

export type ClaimReviewStatus='pending'|'approved'|'rejected'|'withdrawn'|'superseded';
export interface CuratedSourceClaim{
 readonly id:string;
 readonly seriesId:string;
 readonly revision:number;
 readonly parentClaimId:string|null;
 readonly variantId:string;
 readonly referenceId:number;
 readonly therapy:CoreModulatorId;
 readonly scope:ResearchClaimScope;
 readonly genotypePair:readonly [string,string]|null;
 readonly method:ResearchObservationMethod;
 readonly finding:ResearchObservationFinding;
 readonly studyFamilyId:string;
 readonly locator:string;
 readonly rationale:string;
 readonly endpoint:ResearchEndpoint|null;
 readonly studyStats:ReportedStudyStatistics|null;
 readonly studyIdentity:ReportedStudyIdentity|null;
 readonly status:ClaimReviewStatus;
 readonly submittedAt:string;
 readonly submittedByMe:boolean;
 readonly reviewCount:number;
 readonly canReview:boolean;
 readonly reviewedAt:string|null;
 readonly reviewSeals:readonly string[];
 readonly audit:readonly {readonly action:string;readonly at:string}[];
}
export interface CuratedClaimPayload{
 readonly therapy:CoreModulatorId;
 readonly referenceId:number;
 readonly scope:ResearchClaimScope;
 readonly genotypePair:readonly [string,string]|null;
 readonly method:ResearchObservationMethod;
 readonly finding:ResearchObservationFinding;
 readonly studyFamilyId:string;
 readonly locator:string;
 readonly rationale:string;
 readonly endpoint:ResearchEndpoint;
 readonly studyStats:ReportedStudyStatistics;
 readonly studyIdentity:ReportedStudyIdentity;
}
const canonical=/^[1-9][0-9]{0,17}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const allowedTherapies=new Set<CoreModulatorId>(['ETI','ALYFTREK','IVACAFTOR','LUMACAFTOR_IVACAFTOR','TEZACAFTOR_IVACAFTOR']);
const scopes=new Set(['single-variant','genotype-specific']);
const methods=new Set(['clinical-study','in-vitro-study','curated-literature']);
const findings=new Set(['reported-response','reported-no-response','mixed','inconclusive']);
const statuses=new Set<ClaimReviewStatus>(['pending','approved','rejected','withdrawn','superseded']);
const actions=new Set(['submitted','revised','review-approved','review-rejected','approved','rejected','withdrawn','superseded']);
function record(input:unknown):Record<string,unknown>{
 if(!input||typeof input!=='object'||Array.isArray(input))
  throw new VariantConnectionError('schema-mismatch','Invalid source-claim record');
 return input as Record<string,unknown>;
}
function str(value:unknown,name:string,max:number):string{
 if(typeof value!=='string'||!value.trim()||value.length>max)
  throw new VariantConnectionError('schema-mismatch','Invalid '+name);
 return value.trim();
}
function date(value:unknown,name:string):string{
 const text=str(value,name,64);
 if(!Number.isFinite(Date.parse(text)))throw new VariantConnectionError('schema-mismatch','Invalid '+name);
 return text;
}
function verifiedEndpoint(input:unknown):ResearchEndpoint|null{
 if(input===null)return null; // Pre-14H167 immutable historical claim only
 const object=record(input);
 if(Object.keys(object).length!==7||
  !['code','statistic','unit','value','model','comparator','timepoint'].every(k=>Object.prototype.hasOwnProperty.call(object,k)))
  throw new VariantConnectionError('schema-mismatch','Unknown endpoint fields');
 const endpoint=object as unknown as ResearchEndpoint;
 if(!validResearchEndpoint(endpoint))
  throw new VariantConnectionError('schema-mismatch','Incompatible experimental endpoint units or context');
 return Object.freeze({...endpoint});
}
function verifiedStudyStats(raw:unknown,endpoint:ResearchEndpoint|null):ReportedStudyStatistics|null{
 if(raw===null)return null; // Legacy source revisions created before 14H171
 const value=record(raw);
 const keys=['analysisUnit','design','interventionN','comparatorN','uncertaintyType',
  'uncertaintyValue','ciLower','ciUpper','uncertaintyTarget','sourceLocator'];
 if(Object.keys(value).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))
  throw new VariantConnectionError('schema-mismatch','Unknown source study-statistics fields');
 const stats=value as unknown as ReportedStudyStatistics;
 if(!validStudyStatistics(stats,endpoint))
  throw new VariantConnectionError('schema-mismatch','Invalid reported study-design or uncertainty context');
 return Object.freeze({...stats});
}
function verifiedStudyIdentity(raw:unknown):ReportedStudyIdentity|null{
 if(raw===null)return null; // Historical immutable revision
 const data=record(raw);
 const keys=['registryType','registryId','publicationRole','populationModel',
  'diseaseGroup','ageGroup','cohortLabel','populationDescription','sourceLocator'];
 if(Object.keys(data).length!==keys.length||keys.some(k=>!Object.prototype.hasOwnProperty.call(data,k)))
  throw new VariantConnectionError('schema-mismatch','Unrecognized source study identity');
 const identity=data as unknown as ReportedStudyIdentity;
 if(!validReportedStudyIdentity(identity))
  throw new VariantConnectionError('schema-mismatch','Invalid source study or population metadata');
 return Object.freeze({...identity});
}
function claim(raw:unknown,variantId:string):CuratedSourceClaim{
 const row=record(raw);
 const id=str(row.id,'claim id',36),seriesId=str(row.seriesId,'series id',36);
 if(!UUID.test(id)||!UUID.test(seriesId)||row.variantId!==variantId)
  throw new VariantConnectionError('schema-mismatch','Cross-variant or invalid claim identity');
 const parentClaimId=row.parentClaimId===null?null:str(row.parentClaimId,'parent claim',36);
 if(parentClaimId!==null&&!UUID.test(parentClaimId))
  throw new VariantConnectionError('schema-mismatch','Invalid parent claim');
 const revision=row.revision;
 if(!Number.isSafeInteger(revision)||(revision as number)<1||(revision as number)>100||
  (revision===1)!==(parentClaimId===null))
  throw new VariantConnectionError('schema-mismatch','Invalid claim revision');
 const referenceId=row.referenceId;
 if(typeof referenceId!=='number'||!Number.isSafeInteger(referenceId)||referenceId<1)
  throw new VariantConnectionError('schema-mismatch','Invalid reference identifier');
 const therapy=row.therapy as CoreModulatorId;
 if(!allowedTherapies.has(therapy)||!scopes.has(String(row.scope))||!methods.has(String(row.method))||
  !findings.has(String(row.finding))||!statuses.has(row.status as ClaimReviewStatus))
  throw new VariantConnectionError('schema-mismatch','Invalid source claim category');
 const scope=row.scope as ResearchClaimScope;
 let genotypePair:readonly [string,string]|null=null;
 if(scope==='genotype-specific'){
  if(!Array.isArray(row.genotypePair)||row.genotypePair.length!==2||
   !row.genotypePair.every(x=>typeof x==='string'&&canonical.test(x))||
   !row.genotypePair.includes(variantId))
   throw new VariantConnectionError('schema-mismatch','Genotype scope mismatch');
  genotypePair=Object.freeze([row.genotypePair[0] as string,row.genotypePair[1] as string]);
 }else if(row.genotypePair!==null){
  throw new VariantConnectionError('schema-mismatch','Unexpected genotype scope');
 }
 const status=row.status as ClaimReviewStatus;
 if(typeof row.submittedByMe!=='boolean'||typeof row.canReview!=='boolean'||
  !Number.isSafeInteger(row.reviewCount)||typeof row.reviewCount!=='number'||
  row.reviewCount<0||row.reviewCount>2||!Array.isArray(row.reviewSeals)||
  row.reviewSeals.length>2||row.reviewSeals.some(x=>typeof x!=='string'||!/^attestation:[0-9a-f-]{36}$/i.test(x))||
  !Array.isArray(row.audit)||row.audit.length>20)
  throw new VariantConnectionError('schema-mismatch','Invalid review verification metadata');
 const seals=row.reviewSeals as string[];
 if(new Set(seals).size!==seals.length||
  (status==='approved'&&(seals.length!==2||row.reviewCount!==2))||
  (status!=='approved'&&seals.length!==0)||
  (status==='approved'&&row.reviewedAt===null)||
  (status!=='approved'&&row.reviewedAt!==null))
  throw new VariantConnectionError('schema-mismatch','Incomplete reviewer attestations');
 const audit=row.audit.map((v:unknown)=>{
  const entry=record(v);
  if(!actions.has(entry.action as string))
   throw new VariantConnectionError('schema-mismatch','Invalid claim audit action');
  return Object.freeze({action:entry.action as string,at:date(entry.at,'audit time')});
 });
 return Object.freeze({
  id,seriesId,revision:revision as number,parentClaimId,
  variantId,referenceId,therapy,scope,genotypePair,
  method:row.method as ResearchObservationMethod,
  finding:row.finding as ResearchObservationFinding,
  studyFamilyId:str(row.studyFamilyId,'study family',120),
  locator:str(row.locator,'source locator',240),
  rationale:str(row.rationale,'scientific rationale',900),
  endpoint:verifiedEndpoint(row.endpoint),
  studyStats:verifiedStudyStats(row.studyStats,verifiedEndpoint(row.endpoint)),
  studyIdentity:verifiedStudyIdentity(row.studyIdentity),
  status,submittedAt:date(row.submittedAt,'submission time'),
  submittedByMe:row.submittedByMe,reviewCount:row.reviewCount as number,
  canReview:row.canReview,
  reviewedAt:status==='approved'?date(row.reviewedAt,'approval time'):null,
  reviewSeals:Object.freeze(seals),audit:Object.freeze(audit)
 });
}
/** Rejects partial inventories, malformed results, duplicate revisions and
 * spurious reviewer attestations. No study claim is inferred from bibliography.
 */
export function decodeCuratedClaims(raw:unknown,variantId:string):readonly CuratedSourceClaim[]{
 if(!canonical.test(variantId))throw new VariantConnectionError('invalid-configuration','Invalid variant identity');
 const data=record(raw);
 if(data.variantId!==variantId||data.source!=='nfq-double-independent-review-v1'||
  !Array.isArray(data.claims)||data.claims.length>200)
  throw new VariantConnectionError('schema-mismatch','Unverified curated claim inventory');
 const entries=data.claims.map((item:unknown)=>claim(item,variantId));
 const identities=new Set(entries.map((c:CuratedSourceClaim)=>c.id));
 const versions=new Set(entries.map((c:CuratedSourceClaim)=>c.seriesId+':'+c.revision));
 if(identities.size!==entries.length||versions.size!==entries.length)
  throw new VariantConnectionError('schema-mismatch','Duplicated claim revision');
 return Object.freeze(entries);
}
export function reviewedSourceObservations(
 rows:readonly CuratedSourceClaim[],variantId:string,referenceIds:readonly number[]
):readonly DoubleReviewedSourceClaim[]{
 const refs=new Set(referenceIds);
 const current=rows.filter(x=>x.status==='approved'&&x.variantId===variantId);
 if(new Set(current.map(x=>x.seriesId)).size!==current.length)
  throw new VariantConnectionError('schema-mismatch','Concurrent approved revisions');
 for(const item of current){
  if(!refs.has(item.referenceId)||item.reviewSeals.length!==2||item.reviewSeals[0]===item.reviewSeals[1]||
   !item.reviewedAt)throw new VariantConnectionError('schema-mismatch','Unlinked or unverified approved source');
 }
 return Object.freeze(current.map(item=>Object.freeze({
  id:item.id,variantId:item.variantId,therapy:item.therapy,scope:item.scope,
  ...(item.genotypePair?{genotypePair:item.genotypePair}:{}),
  method:item.method,finding:item.finding,studyFamilyId:item.studyFamilyId,
  referenceId:item.referenceId,locator:item.locator,
  reviewedBy:[item.reviewSeals[0]!,item.reviewSeals[1]!] as const,
  reviewedAt:item.reviewedAt!,
  endpoint:item.endpoint
 })));
}
export function validSourceClaimPayload(
 variantId:string,data:CuratedClaimPayload,linkedReferenceIds:readonly number[]
):boolean{
 if(!canonical.test(variantId)||!allowedTherapies.has(data.therapy)||
  !linkedReferenceIds.includes(data.referenceId)||
  !scopes.has(data.scope)||!methods.has(data.method)||!findings.has(data.finding)||
  !/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(data.studyFamilyId)||
  data.locator.trim().length<8||data.locator.trim().length>240||
  data.rationale.trim().length<20||data.rationale.trim().length>900||
  /[\u0000-\u001f\u007f]/.test(data.locator+data.rationale)||
  !validResearchEndpoint(data.endpoint)||
  !validStudyStatistics(data.studyStats,data.endpoint)||
  !validReportedStudyIdentity(data.studyIdentity))return false;
 if(data.scope==='single-variant')return data.genotypePair===null;
 return Array.isArray(data.genotypePair)&&data.genotypePair.length===2&&
  data.genotypePair.every(id=>canonical.test(id))&&data.genotypePair.includes(variantId);
}
export function createCuratedSourceClaimService(
 config:ReadOnlyConfig,session:ReadSessionProvider,transport:typeof fetch=fetch
){
 const root=validateReadOnlyConfig(config);
 async function request(action:'list'|'submit'|'revise'|'review'|'withdraw',
  variantId:string,claimId:string|null,payload:unknown,expectedRevision:number|null,
  signal?:AbortSignal):Promise<unknown>{
  if(!canonical.test(variantId)||claimId!==null&&!UUID.test(claimId)||
   expectedRevision!==null&&(!Number.isSafeInteger(expectedRevision)||expectedRevision<1))
   throw new VariantConnectionError('invalid-configuration','Invalid research claim request');
  const token=await session.getAccessToken();
  if(!token||token===config.publishableKey||
   !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token))
   throw new VariantConnectionError('authentication-required','Verified researcher session required');
  const url=new URL('/rest/v1/rpc/nfq_reviewed_source_claims',root);
  const response=await transport(url.toString(),{
   method:'POST',headers:{apikey:config.publishableKey,Authorization:'Bearer '+token,
    'content-type':'application/json',Accept:'application/json'},
   body:JSON.stringify({p_action:action,p_variant_id:variantId,p_claim_id:claimId,
    p_payload:payload,p_expected_revision:expectedRevision}),
   credentials:'omit',cache:'no-store',redirect:'error',signal
  });
  if(signal?.aborted)throw new VariantConnectionError('request-failed','Research request cancelled');
  if(response.status===401||response.status===403)
   throw new VariantConnectionError('access-denied','Research membership or review role is not verified');
  if(!response.ok)throw new VariantConnectionError('request-failed','Research review command was not accepted');
  return response.json();
 }
 return Object.freeze({
  async list(variantId:string,signal?:AbortSignal):Promise<readonly CuratedSourceClaim[]>{
   return decodeCuratedClaims(await request('list',variantId,null,null,null,signal),variantId);
  },
  async submit(variantId:string,payload:CuratedClaimPayload,referenceIds:readonly number[]):Promise<string>{
   if(!validSourceClaimPayload(variantId,payload,referenceIds))
    throw new VariantConnectionError('invalid-configuration','Complete source citation and scope required');
   const data=record(await request('submit',variantId,null,payload,null));
   if(data.status!=='pending'||typeof data.id!=='string'||!UUID.test(data.id))
    throw new VariantConnectionError('schema-mismatch','Submission response was not verified');
   return data.id;
  },
  async revise(variantId:string,claimId:string,revision:number,payload:CuratedClaimPayload,
   referenceIds:readonly number[]):Promise<string>{
   if(!validSourceClaimPayload(variantId,payload,referenceIds))
    throw new VariantConnectionError('invalid-configuration','Complete source citation and scope required');
   const data=record(await request('revise',variantId,claimId,payload,revision));
   if(data.status!=='pending'||typeof data.id!=='string'||!UUID.test(data.id)||
    data.revision!==revision+1)
    throw new VariantConnectionError('schema-mismatch','Revision response was not verified');
   return data.id;
  },
  async review(variantId:string,claimId:string,revision:number,decision:'approve'|'reject',
   note:string):Promise<{readonly status:ClaimReviewStatus;readonly reviewCount:number}>{
   if(note.trim().length<20||note.length>900)
    throw new VariantConnectionError('invalid-configuration','Independent review rationale required');
   const data=record(await request('review',variantId,claimId,{decision,note},revision));
   if(data.id!==claimId||!statuses.has(data.status as ClaimReviewStatus)||
    typeof data.reviewCount!=='number'||!Number.isSafeInteger(data.reviewCount)||
    data.reviewCount<0||data.reviewCount>2)
    throw new VariantConnectionError('schema-mismatch','Review result could not be verified');
   return {status:data.status as ClaimReviewStatus,reviewCount:data.reviewCount};
  },
  async withdraw(variantId:string,claimId:string,revision:number):Promise<void>{
   const data=record(await request('withdraw',variantId,claimId,{},revision));
   if(data.id!==claimId||data.status!=='withdrawn')
    throw new VariantConnectionError('schema-mismatch','Withdrawal was not verified');
  }
 });
}
