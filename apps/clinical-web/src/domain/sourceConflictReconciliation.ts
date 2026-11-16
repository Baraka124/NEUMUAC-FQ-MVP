import type {CoreModulatorId} from './therapyRegistry';
import {
 validResearchEndpoint,endpointComparisonKey,type ResearchEndpoint
} from './researchEndpointNormalization';

/** Source-reviewed observations are NOT constructed from historical variant flags,
 * bibliographic links, generic source quality numbers or class-wide associations.
 * Each claim must be exact-scope, explicitly double-reviewed and traceable.
 */
export type ResearchObservationMethod='clinical-study'|'in-vitro-study'|'curated-literature';
export type ResearchObservationFinding='reported-response'|'reported-no-response'|'mixed'|'inconclusive';
export type ResearchClaimScope='single-variant'|'genotype-specific';
export interface DoubleReviewedSourceClaim{
 readonly id:string;
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly scope:ResearchClaimScope;
 readonly genotypePair?:readonly [string,string];
 readonly method:ResearchObservationMethod;
 readonly finding:ResearchObservationFinding;
 readonly studyFamilyId:string;
 readonly referenceId:number;
 readonly locator:string;
 readonly reviewedBy:readonly [string,string];
 readonly reviewedAt:string;
 readonly endpoint?:ResearchEndpoint|null;
}
export type ResearchConflictKind=
 'opposing-reviewed-studies'|'within-study-disagreement'|
 'clinical-laboratory-translation'|'scope-mismatch'|
 'archive-versus-reviewed-source';
export interface ResearchEvidenceConflict{
 readonly id:string;
 readonly therapy:CoreModulatorId;
 readonly kind:ResearchConflictKind;
 readonly claimIds:readonly string[];
 readonly message:string;
 readonly resolution:'requires-independent-review';
}
export type ResearchClaimDirection='response'|'no-response'|'mixed'|'unavailable';
export interface ReconciledResearchEvidence{
 readonly direction:ResearchClaimDirection;
 readonly verifiedStudyFamilies:number;
 readonly positiveFamilies:number;
 readonly negativeFamilies:number;
 readonly pendingObservations:number;
 readonly conflicts:readonly ResearchEvidenceConflict[];
 readonly citedReferenceIds:readonly number[];
 readonly excludedClaimIds:readonly string[];
 readonly numericEndpointRows:number;
 readonly endpointGroups:readonly {
  readonly contextKey:string;
  readonly observationCount:number;
  readonly independentStudyFamilies:number;
  readonly values:readonly number[];
  readonly code:string;
  readonly unit:string;
  readonly statistic:string;
  readonly model:string;
 }[];
 readonly incomparableEndpointRows:number;
}

const ID=/^[1-9]\d{0,17}$/;
const methods:readonly ResearchObservationMethod[]=['clinical-study','in-vitro-study','curated-literature'];
const findings:readonly ResearchObservationFinding[]=['reported-response','reported-no-response','mixed','inconclusive'];
const therapies:readonly CoreModulatorId[]=['ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'];
const direction=(finding:ResearchObservationFinding):'positive'|'negative'|'other'=>finding==='reported-response'?'positive':finding==='reported-no-response'?'negative':'other';
const claimKey=(claim:DoubleReviewedSourceClaim):string=>
 claim.scope+'|'+(claim.genotypePair?[...claim.genotypePair].sort().join('+'):'')+'|'+claim.method;
function safeClaim(claim:DoubleReviewedSourceClaim,variantId:string,allowedReferences:ReadonlySet<number>):boolean{
 if(claim.variantId!==variantId||!ID.test(claim.variantId)||!therapies.includes(claim.therapy)||
  !methods.includes(claim.method)||!findings.includes(claim.finding)||
  !['single-variant','genotype-specific'].includes(claim.scope)||
  !Number.isSafeInteger(claim.referenceId)||!allowedReferences.has(claim.referenceId)||
  !claim.id||claim.id.length>120||!claim.studyFamilyId||claim.studyFamilyId.length>120||
  !claim.locator.trim()||claim.locator.length>240||!Array.isArray(claim.reviewedBy)||
  claim.reviewedBy.length!==2||!claim.reviewedBy[0]?.trim()||!claim.reviewedBy[1]?.trim()||
  claim.reviewedBy[0]===claim.reviewedBy[1]||!Number.isFinite(Date.parse(claim.reviewedAt))||
  (claim.endpoint!==undefined&&claim.endpoint!==null&&!validResearchEndpoint(claim.endpoint)))return false;
 if(claim.scope==='genotype-specific'){
  return Array.isArray(claim.genotypePair)&&claim.genotypePair.length===2&&
   claim.genotypePair.every(x=>ID.test(x))&&claim.genotypePair.includes(variantId);
 }
 return !claim.genotypePair;
}
function conflict(therapy:CoreModulatorId,kind:ResearchConflictKind,claims:readonly DoubleReviewedSourceClaim[],message:string):ResearchEvidenceConflict{
 const ids=claims.map(x=>x.id).sort();
 return Object.freeze({
  id:kind+':'+therapy+':'+ids.join(':'),
  therapy,kind,claimIds:Object.freeze(ids),message,
  resolution:'requires-independent-review' as const
 });
}
/** Deterministic, unweighted scientific reconciliation. It does not adjudicate
 * a conflict, perform patient prediction, or treat two records from the same
 * study as two independent validating studies.
 */
export function reconcileReviewedSourceClaims(
 variantId:string,therapy:CoreModulatorId,
 claims:readonly DoubleReviewedSourceClaim[],
 linkedReferenceIds:readonly number[],
):ReconciledResearchEvidence{
 if(!ID.test(variantId)||!therapies.includes(therapy)||claims.length>1000||
  linkedReferenceIds.length>200||new Set(linkedReferenceIds).size!==linkedReferenceIds.length)
  throw new Error('Invalid or incomplete research context');
 const references=new Set(linkedReferenceIds);
 const relevant=claims.filter(x=>x.therapy===therapy);
 const excluded:string[]=[];
 const verified:DoubleReviewedSourceClaim[]=[];
 const uniqueIds=new Set<string>();
 for(const item of relevant){
  if(uniqueIds.has(item.id))throw new Error('Duplicated evidence-claim identity');
  uniqueIds.add(item.id);
  if(!safeClaim(item,variantId,references)){excluded.push(item.id);continue;}
  verified.push(item);
 }
 // Identical experimental families cannot count twice as independent studies.
 const families=new Map<string,DoubleReviewedSourceClaim[]>();
 for(const c of verified)families.set(c.studyFamilyId,[...(families.get(c.studyFamilyId)||[]),c]);
 const flags:ResearchEvidenceConflict[]=[];
 const directional:DoubleReviewedSourceClaim[]=[];
 let positive=0,negative=0;
 for(const family of families.values()){
  const pos=family.filter(c=>direction(c.finding)==='positive');
  const neg=family.filter(c=>direction(c.finding)==='negative');
  if(pos.length&&neg.length){
   flags.push(conflict(therapy,'within-study-disagreement',family,
    'The same study family reports opposing findings; independent review required.'));
   continue;
  }
  if(pos.length)positive++;
  if(neg.length)negative++;
  if(pos.length||neg.length)directional.push((pos[0]??neg[0])!);
 }
 const pos=directional.filter(c=>direction(c.finding)==='positive');
 const neg=directional.filter(c=>direction(c.finding)==='negative');
 const emitted=new Set<string>();
 for(const a of pos)for(const b of neg){
  const kind:ResearchConflictKind=claimKey(a)===claimKey(b)?
   'opposing-reviewed-studies':a.scope!==b.scope?'scope-mismatch':'clinical-laboratory-translation';
  const key=kind+'|'+a.studyFamilyId+'|'+b.studyFamilyId;
  if(emitted.has(key))continue;
  emitted.add(key);
  flags.push(conflict(therapy,kind,[a,b],
   kind==='opposing-reviewed-studies'?'Independent, comparable study reports disagree.':
   kind==='scope-mismatch'?'Findings concern different biological scopes; no direct contradiction is inferred.':
   'Clinical and nonclinical source methods differ; translation requires review.'));
 }
 const directionState:ResearchClaimDirection=flags.some(f=>f.kind==='opposing-reviewed-studies'||f.kind==='within-study-disagreement')?
  'mixed':positive&&negative?'mixed':positive?'response':negative?'no-response':'unavailable';
 // An endpoint is a source-reported observation, not an effect estimate.
 // Comparability is deliberately strict: never average or convert different
 // study models, comparators, outcomes, timepoints or reporting statistics.
 const numeric=verified.filter(c=>c.endpoint&&validResearchEndpoint(c.endpoint)&&c.endpoint.value!==null);
 const groups=new Map<string,DoubleReviewedSourceClaim[]>();
 let incomparable=0;
 for(const claim of numeric){
  const key=endpointComparisonKey(claim.endpoint!,claim.scope,claim.genotypePair,claim.method);
  if(!key){incomparable++;continue;}
  groups.set(key,[...(groups.get(key)??[]),claim]);
 }
 const endpointGroups=[...groups].map(([contextKey,records])=>Object.freeze({
  contextKey,
  observationCount:records.length,
  independentStudyFamilies:new Set(records.map(r=>r.studyFamilyId)).size,
  values:Object.freeze(records.map(r=>r.endpoint!.value!)),
  code:records[0]!.endpoint!.code,
  unit:records[0]!.endpoint!.unit,
  statistic:records[0]!.endpoint!.statistic,
  model:records[0]!.endpoint!.model
 }));
 return Object.freeze({
  numericEndpointRows:numeric.length,
  endpointGroups:Object.freeze(endpointGroups),
  incomparableEndpointRows:incomparable,
  direction:directionState,verifiedStudyFamilies:families.size,
  positiveFamilies:positive,negativeFamilies:negative,
  pendingObservations:excluded.length,
  conflicts:Object.freeze(flags),
  citedReferenceIds:Object.freeze([...new Set(verified.map(x=>x.referenceId))].sort((a,b)=>a-b)),
  excludedClaimIds:Object.freeze(excluded)
 });
}
