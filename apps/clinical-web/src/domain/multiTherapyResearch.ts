import {THERAPIES,type CoreModulatorId,type RecordedResponse,type VariantTherapyProfile} from './therapyRegistry';
import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {
 reconcileReviewedSourceClaims,type DoubleReviewedSourceClaim,
 type ReconciledResearchEvidence,type ResearchEvidenceConflict
} from './sourceConflictReconciliation';

/** Historical variant_evidence rows carry categorical archival flags, not
 * independently verified experimental observations or therapeutic outcomes. */
export interface ArchivedTherapyEvidence{
 readonly id:number;
 readonly variantId:string;
 readonly sourceId:number|null;
 readonly etiResponse:RecordedResponse;
 readonly alyftrekResponse:RecordedResponse;
 readonly recordedConfidence:string|null;
 readonly recordedAt:string|null;
}
export type ResearchAssessmentState='reviewed-response-report'|'reviewed-no-response-report'|
 'review-conflict'|'review-scope-uncertain'|'archived-records-only'|'insufficient-evidence';
export interface TherapyResearchAssessment{
 readonly therapy:CoreModulatorId;
 readonly recordedResponse:RecordedResponse;
 readonly archivalResponsive:number;
 readonly archivalNonresponsive:number;
 readonly archivalUnknown:number;
 readonly archiveDisagreesWithRecorded:boolean;
 readonly historicalContradictionEvents:number;
 readonly sourceAssessment:ReconciledResearchEvidence;
 readonly state:ResearchAssessmentState;
 readonly conflicts:readonly ResearchEvidenceConflict[];
 readonly needsResearchReview:boolean;
 readonly evidenceNote:string;
 readonly clinicalPredictionProvided:false;
}
export interface MultiTherapyResearchReport{
 readonly variantId:string;
 readonly scope:'variant-research-only';
 readonly sourceState:'loaded-verified-catalog';
 readonly assessedTherapies:readonly TherapyResearchAssessment[];
 readonly bibliographicLinks:number;
 readonly independentlyReviewedClaims:number;
 readonly unresolvedStudyConflicts:number;
 readonly historicalContradictionEvents:number;
 readonly gapCount:number;
 readonly dataLimitations:readonly string[];
 readonly clinicalDecisionProvided:false;
}
const ID=/^[1-9]\d{0,17}$/;
const archivedLabel=(row:ArchivedTherapyEvidence,therapy:CoreModulatorId):RecordedResponse=>
 therapy==='ETI'?row.etiResponse:therapy==='ALYFTREK'?row.alyftrekResponse:null;
const recordedLabel=(profile:VariantTherapyProfile,therapy:CoreModulatorId):RecordedResponse=>
 profile.entries.find(item=>item.therapy===therapy)?.response??null;
function validArchive(row:ArchivedTherapyEvidence,id:string):boolean{
 return Number.isSafeInteger(row.id)&&row.id>0&&row.variantId===id&&
 (row.sourceId===null||(Number.isSafeInteger(row.sourceId)&&row.sourceId>0))&&
 [null,'responsive','non_responsive','unknown'].includes(row.etiResponse)&&
 [null,'responsive','non_responsive','unknown'].includes(row.alyftrekResponse);
}
/** Assembles only actual, complete variant-scoped read responses. It does not
 * silently infer studied effects from therapy name, class, abstract,
 * literature count, historical flags, or a rule match.
 */
export function buildMultiTherapyResearchReport(input:{
 readonly variantId:string;
 readonly therapyProfile:VariantTherapyProfile;
 readonly references:readonly LiveEvidenceReference[];
 readonly history:ResearchHistory;
 readonly archivedEvidence:readonly ArchivedTherapyEvidence[];
 readonly reviewedObservations?:readonly DoubleReviewedSourceClaim[];
}):MultiTherapyResearchReport{
 const id=input.variantId;
 if(!ID.test(id)||input.therapyProfile.variantId!==id||
  input.references.length>200||input.archivedEvidence.length>200||
  input.history.conflicts.length>200||input.history.validations.length>200||
  (input.reviewedObservations?.length??0)>1000)throw new Error('Incomplete or invalid research dataset');
 if(input.references.some(x=>x.variantId!==id)||input.archivedEvidence.some(x=>!validArchive(x,id))||
  input.history.conflicts.some(x=>x.variantId!==id)||
  input.history.validations.some(x=>x.variantId!==id)||
  new Set(input.references.map(x=>x.id)).size!==input.references.length||
  new Set(input.archivedEvidence.map(x=>x.id)).size!==input.archivedEvidence.length)
  throw new Error('Cross-variant, duplicate or malformed evidence records');
 const observations=input.reviewedObservations??[];
 const referenceIds=input.references.map(x=>x.id);
 const assessments=THERAPIES.map(({id:therapy}):TherapyResearchAssessment=>{
  const recorded=recordedLabel(input.therapyProfile,therapy);
  const archive=input.archivedEvidence.map(row=>archivedLabel(row,therapy));
  const archivalResponsive=archive.filter(x=>x==='responsive').length;
  const archivalNonresponsive=archive.filter(x=>x==='non_responsive').length;
  const archivalUnknown=archive.filter(x=>x==='unknown').length;
  const archiveDisagreesWithRecorded=
   (recorded==='responsive'&&archivalNonresponsive>0)||
   (recorded==='non_responsive'&&archivalResponsive>0)||
   (archivalResponsive>0&&archivalNonresponsive>0);
  const sourceAssessment=reconcileReviewedSourceClaims(id,therapy,observations,referenceIds);
  const historicalContradictionEvents=input.history.conflicts.filter(x=>{
   if(therapy==='ETI')return x.field==='eti_prediction'||x.field==='eti_response';
   if(therapy==='ALYFTREK')return x.field==='alyftrek_prediction'||x.field==='alyftrek_response';
   return false;
  }).length;
  const recordedDisagreesWithSource=
   (recorded==='responsive'&&sourceAssessment.direction==='no-response')||
   (recorded==='non_responsive'&&sourceAssessment.direction==='response');
  const conflicts:ResearchEvidenceConflict[]=recordedDisagreesWithSource?[...sourceAssessment.conflicts,{
   id:'archive-versus-reviewed-source:'+therapy+':'+id,therapy,
   kind:'archive-versus-reviewed-source',claimIds:Object.freeze([]),
   message:'Recorded legacy response category and independently reviewed reports differ. Neither is automatically overwritten.',
   resolution:'requires-independent-review'
  }]:[...sourceAssessment.conflicts];
  const hasDirectConflict=conflicts.some(x=>x.kind==='opposing-reviewed-studies'||
   x.kind==='within-study-disagreement'||x.kind==='archive-versus-reviewed-source');
  const state:ResearchAssessmentState=hasDirectConflict?'review-conflict':
   sourceAssessment.direction==='mixed'?'review-scope-uncertain':
   sourceAssessment.direction==='response'?'reviewed-response-report':
   sourceAssessment.direction==='no-response'?'reviewed-no-response-report':
   archivalResponsive||archivalNonresponsive||archivalUnknown||recorded!==null?
    'archived-records-only':'insufficient-evidence';
  const needsResearchReview=archiveDisagreesWithRecorded||historicalContradictionEvents>0||
    conflicts.length>0||sourceAssessment.pendingObservations>0||
    state==='insufficient-evidence'||state==='archived-records-only';
  const evidenceNote: string=state==='review-conflict'?
   'Conflicting source claims or disagreement with a historical record requires independent review.':
   state==='review-scope-uncertain'?'Non-equivalent experimental methods or scopes cannot be pooled.':
   state==='reviewed-response-report'?'Reviewed source observations report a response; not a patient response prediction.':
   state==='reviewed-no-response-report'?'Reviewed source observations report no response; not a treatment exclusion.':
   state==='archived-records-only'?'Historical recorded categories exist, but no independently reviewed source observations are available.':
   'No independently reviewed treatment-response observations are available for this regimen.';
  return Object.freeze({
   therapy,recordedResponse:recorded,archivalResponsive,archivalNonresponsive,archivalUnknown,
   archiveDisagreesWithRecorded,historicalContradictionEvents,
   sourceAssessment,conflicts:Object.freeze(conflicts),
   state,needsResearchReview,evidenceNote,clinicalPredictionProvided:false as const
  });
 });
 const claimCount=assessments.reduce((n,x)=>n+x.sourceAssessment.verifiedStudyFamilies,0);
 return Object.freeze({
  variantId:id,scope:'variant-research-only',sourceState:'loaded-verified-catalog',
  assessedTherapies:Object.freeze(assessments),
  bibliographicLinks:input.references.length,
  independentlyReviewedClaims:claimCount,
  unresolvedStudyConflicts:assessments.reduce((n,x)=>n+x.conflicts.length,0),
  historicalContradictionEvents:input.history.conflicts.length,
  gapCount:assessments.filter(x=>x.state==='insufficient-evidence'||x.state==='archived-records-only').length,
  dataLimitations:Object.freeze([
   'Historical database response categories are not clinical response predictions.',
   'Bibliographic references are not evidence claims until the underlying source is independently reviewed.',
   'Archived variant_evidence labels have no independently verified source claim or study endpoint.',
   'The five original genotype rules are separate from observed pharmacological responses.',
   'No patient genotype, phase, haplotype, phenotype, dosing or treatment eligibility is assessed.'
  ]),
  clinicalDecisionProvided:false as const
 });
}
