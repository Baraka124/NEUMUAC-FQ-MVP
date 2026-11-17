import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CoreModulatorId} from './therapyRegistry';
import {THERAPIES} from './therapyRegistry';
import {endpointComparisonKey} from './researchEndpointNormalization';

/** Cross-variant exploratory evidence questions assembled ONLY from separately
 * loaded, double-reviewed, source-linked claims. This is not an equivalence,
 * mechanistic classification or prediction engine.
 */
export interface PairedResearchSource{
 readonly variantId:string;
 readonly claimId:string;
 readonly therapy:CoreModulatorId;
 readonly studyFamilyId:string;
 readonly finding:CuratedSourceClaim['finding'];
 readonly method:CuratedSourceClaim['method'];
 readonly scope:CuratedSourceClaim['scope'];
 readonly endpointCode:string;
 readonly endpointContext:string|null;
 readonly sourceTitle:string;
 readonly sourceUrl:string;
 readonly sourceLocator:string;
 readonly reviewedAt:string;
}
export interface PairedEvidenceQuestion{
 readonly id:string;
 readonly therapy:CoreModulatorId;
 readonly relation:'comparable-assay-context'|'different-assay-context';
 readonly left:PairedResearchSource;
 readonly right:PairedResearchSource;
 readonly researchQuestion:string;
 readonly requiresScientificReview:true;
}
export interface MechanismEvidenceReview{
 readonly firstId:string;
 readonly secondId:string;
 readonly recordedClassRelation:'same-recorded-class'|'different-recorded-class'|'not-established';
 readonly mechanismEstablished:false;
 readonly questions:readonly PairedEvidenceQuestion[];
 readonly firstApprovedSources:number;
 readonly secondApprovedSources:number;
 readonly note:string;
}
const canonical=/^[1-9][0-9]{0,17}$/;
function approved(
 id:string,claims:readonly CuratedSourceClaim[],refs:readonly LiveEvidenceReference[]
):readonly PairedResearchSource[]{
 if(claims.length>200||refs.length>200||
  claims.some(c=>c.variantId!==id)||refs.some(r=>r.variantId!==id)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(refs.map(r=>r.id)).size!==refs.length)
  throw new Error('Incomplete cross-variant source scope');
 const references=new Map(refs.map(r=>[r.id,r]));
 const active=claims.filter(c=>c.status==='approved');
 if(new Set(active.map(c=>c.seriesId)).size!==active.length)
  throw new Error('Concurrent approved revisions');
 if(active.some(c=>c.reviewCount!==2||c.reviewSeals.length!==2||
  c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt||!references.has(c.referenceId)))
  throw new Error('Unverified cross-variant source provenance');
 return Object.freeze(active.map(c=>{
  const ref=references.get(c.referenceId)!;
  return Object.freeze({
   variantId:id,claimId:c.id,therapy:c.therapy,studyFamilyId:c.studyFamilyId,
   finding:c.finding,method:c.method,scope:c.scope,
   endpointCode:c.endpoint?.code??'not-reported',
   endpointContext:endpointComparisonKey(c.endpoint,c.scope,c.genotypePair??undefined,c.method),
   sourceTitle:ref.title,sourceUrl:ref.url,sourceLocator:c.locator,
   reviewedAt:c.reviewedAt!
  });
 }));
}
export function buildPairedEvidenceQuestions(input:{
 readonly firstId:string;readonly secondId:string;
 readonly firstClass:string|null;readonly secondClass:string|null;
 readonly firstClaims:readonly CuratedSourceClaim[];
 readonly secondClaims:readonly CuratedSourceClaim[];
 readonly firstReferences:readonly LiveEvidenceReference[];
 readonly secondReferences:readonly LiveEvidenceReference[];
}):MechanismEvidenceReview{
 if(!canonical.test(input.firstId)||!canonical.test(input.secondId)||
  input.firstId===input.secondId)throw new Error('Distinct exact variant identities required');
 const left=approved(input.firstId,input.firstClaims,input.firstReferences);
 const right=approved(input.secondId,input.secondClaims,input.secondReferences);
 const a=input.firstClass?.trim().toUpperCase()??'';
 const b=input.secondClass?.trim().toUpperCase()??'';
 const relation:MechanismEvidenceReview['recordedClassRelation']=!a||!b?'not-established':
  a===b?'same-recorded-class':'different-recorded-class';
 const questions:PairedEvidenceQuestion[]=[];
 // Limit growth. Do not treat multiple papers within a study family as
 // independent comparisons. All pairs remain visible as pointers, not pooled.
 for(const therapy of THERAPIES){
  const l=left.filter(c=>c.therapy===therapy.id);
  const r=right.filter(c=>c.therapy===therapy.id);
  const visited=new Set<string>();
  for(const first of l){
   if(questions.length>=100)break;
   for(const second of r){
   if(questions.length>=100)break;
   const identity=first.studyFamilyId+'|'+second.studyFamilyId;
   if(visited.has(identity))continue;
   visited.add(identity);
   const same=first.endpointContext!==null&&first.endpointContext===second.endpointContext;
   const relation=same?'comparable-assay-context':'different-assay-context';
   const question=same?
    'Do original studies support a reproducible variant-specific difference under the recorded assay context? Review genotype, population, effect uncertainty and experimental replication before interpretation.':
    'Which genotype, experimental model, endpoint, comparator or timepoint differences prevent direct interpretation across these two source observations?';
   questions.push(Object.freeze({
    id:therapy.id+':'+first.claimId+':'+second.claimId,therapy:therapy.id,
    relation,left:first,right:second,researchQuestion:question,
    requiresScientificReview:true as const
   }));
   }
  }
  if(questions.length>=100)break;
 }
 return Object.freeze({
  firstId:input.firstId,secondId:input.secondId,
  recordedClassRelation:relation,mechanismEstablished:false as const,
  questions:Object.freeze(questions),
  firstApprovedSources:left.length,secondApprovedSources:right.length,
  note:'Recorded CFTR functional class is historical descriptive metadata, not a measured molecular mechanism. Two reviewed studies can have matching endpoint descriptions without establishing mechanism equivalence, clinical response, or shared drug eligibility.'
 });
}
