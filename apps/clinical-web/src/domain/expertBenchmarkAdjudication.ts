import {PUBLISHED_CFTR_REFERENCE_CASES,inspectPublishedCase} from './publishedCftrReferenceCases';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** 14H198–199. Pure, read-only scientific benchmark logic.
 * Nothing in this module asserts expert sign-off or writes clinical claims.
 * Caller-provided reviewer identities are NOT authenticated by this module.
 * A trusted service must verify identity, independent submissions and audit records.
 */
export type ExpertFinding='supports'|'does-not-support'|'inconclusive'|'not-assessable';
export type BenchmarkDisposition='awaiting-experts'|'needs-adjudication'|'awaiting-claim-mapping'|'ready-to-compare';
export interface ExpertExtraction {
 readonly caseId:string;readonly variantId:string;readonly pmid:string;
 readonly reviewerId:string;readonly submittedAt:string;
 readonly sourceLocator:string;readonly genotypeContext:string;
 readonly endpoint:string;readonly modelOrCohort:string;
 readonly finding:ExpertFinding;readonly claimId:string|null;
 readonly methodNotes:string;
}
export interface ExpertAdjudication {
 readonly caseId:string;readonly variantId:string;readonly adjudicatorId:string;
 readonly submittedAt:string;readonly finalFinding:ExpertFinding;
 readonly sourceLocator:string;readonly justification:string;
 readonly acceptedReviewerIds:readonly [string,string];
}
export interface ExpertBenchmark {
 readonly disposition:BenchmarkDisposition;
 readonly expertFinding:ExpertFinding|null;
 readonly disagreements:readonly string[];
 readonly issues:readonly string[];
 readonly matchedClaimIds:readonly string[];
 readonly comparison:'not-comparable'|'matching-finding'|'different-finding'|'missing-platform-claim';
 readonly independentlyValidated:false;
 readonly clinicalDecision:false;
}
const validId=(v:string)=>/^[1-9][0-9]{0,17}$/.test(v);
const filled=(v:string)=>v.trim().length>=3&&v.trim().length<=2000;
const validTime=(v:string)=>/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v));
const normalize=(v:string)=>v.trim().toLowerCase().replace(/\s+/g,' ');
const matchingFields=(a:ExpertExtraction,b:ExpertExtraction)=>
 ['genotypeContext','endpoint','modelOrCohort','finding','claimId'].filter(key=>{
  const x=a[key as keyof ExpertExtraction],y=b[key as keyof ExpertExtraction];
  return typeof x==='string'&&typeof y==='string'?normalize(x)!==normalize(y):x!==y;
 });
/** The engine does not equate a platform 'positive' with a clinical response.
 * It compares source-claim finding labels only when an adjudicator has supplied
 * an exact source claim ID. No matching across inferred synonyms.
 */
export function evaluateExpertBenchmark(input:{
 caseId:string;variantId:string;
 references:readonly LiveEvidenceReference[];
 claims:readonly CuratedSourceClaim[];
 extracts:readonly ExpertExtraction[];
 adjudication?:ExpertAdjudication|null;
}):ExpertBenchmark {
 const challenge=PUBLISHED_CFTR_REFERENCE_CASES.find(c=>c.id===input.caseId);
 if(!challenge||!validId(input.variantId))throw new Error('Invalid reference case or variant ID');
 if(input.extracts.length>2)throw new Error('Exactly two independent expert extraction slots are supported');
 const review=inspectPublishedCase({caseId:input.caseId,variantId:input.variantId,
  references:input.references,claims:input.claims});
 const issues=[...review.issues],disagreements:string[]=[];
 const extracts=input.extracts;
 const identities=new Set<string>();
 for(const e of extracts){
  if(e.caseId!==input.caseId||e.variantId!==input.variantId||e.pmid!==challenge.pmid||
   !filled(e.reviewerId)||!validTime(e.submittedAt)||!filled(e.sourceLocator)||
   !filled(e.genotypeContext)||!filled(e.endpoint)||!filled(e.modelOrCohort)||
   !filled(e.methodNotes)||!['supports','does-not-support','inconclusive','not-assessable'].includes(e.finding)||
   (e.claimId!==null&&!filled(e.claimId)))
   throw new Error('Incomplete or mismatched independent extraction');
  if(identities.has(normalize(e.reviewerId)))throw new Error('Two genuinely distinct reviewer identities are required');
  identities.add(normalize(e.reviewerId));
 }
 if(extracts.length<2)return Object.freeze({
  disposition:'awaiting-experts' as const,expertFinding:null,
  disagreements:Object.freeze(disagreements),issues:Object.freeze([...issues,'Two independent extractions required']),
  matchedClaimIds:Object.freeze([]),comparison:'not-comparable' as const,
  independentlyValidated:false as const,clinicalDecision:false as const
 });
 disagreements.push(...matchingFields(extracts[0]!,extracts[1]!));
 const adjudication=input.adjudication;
 if(disagreements.length&&!adjudication)issues.push('Expert disagreement requires an independent adjudicator');
 if(adjudication){
  if(adjudication.caseId!==input.caseId||adjudication.variantId!==input.variantId||
   !filled(adjudication.adjudicatorId)||identities.has(normalize(adjudication.adjudicatorId))||
   !validTime(adjudication.submittedAt)||!filled(adjudication.sourceLocator)||
   !filled(adjudication.justification)||
   !['supports','does-not-support','inconclusive','not-assessable'].includes(adjudication.finalFinding)||
   adjudication.acceptedReviewerIds.length!==2||
   new Set(adjudication.acceptedReviewerIds.map(normalize)).size!==2||
   !adjudication.acceptedReviewerIds.every(id=>identities.has(normalize(id))))
   throw new Error('Invalid independent adjudication');
 }
 const finding=adjudication?.finalFinding??(disagreements.length?null:extracts[0]!.finding);
 const claimId=adjudication?null:(disagreements.length?null:extracts[0]!.claimId);
 // Adjudicated disagreements must be explicitly reconciled to a reviewed claim
 // in a separate attested mapping; never silently reuse a disputed reviewer ID.
 const selected=claimId?input.claims.filter(c=>c.id===claimId&&review.matchedScopeClaimIds.includes(c.id)):[];
 if(finding!==null&&!selected.length)issues.push('No exact approved, scope-compatible platform claim mapped for comparison');
 const disposition:BenchmarkDisposition=disagreements.length&&!adjudication?'needs-adjudication':
  disagreements.length&&adjudication?'awaiting-claim-mapping':
  'ready-to-compare';
 // An independently verified adjudication-to-claim mapping is not yet provided.
 const comparison:ExpertBenchmark['comparison']=!selected.length?
  (finding===null?'not-comparable':'missing-platform-claim'):'not-comparable';
 return Object.freeze({
  disposition,expertFinding:finding,
  disagreements:Object.freeze(disagreements),issues:Object.freeze(issues),
  matchedClaimIds:Object.freeze(selected.map(c=>c.id)),comparison,
  independentlyValidated:false as const,clinicalDecision:false as const
 });
}
