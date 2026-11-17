import type {MultiTherapyResearchReport} from './multiTherapyResearch';
import type {CoreModulatorId} from './therapyRegistry';

/** Two complete, independently loaded variant-scoped research snapshots.
 * Identical functional class is a comparison descriptor, never a biological
 * or treatment-response equivalence claim.
 */
export interface CrossVariantEvidenceRow {
 readonly therapy:CoreModulatorId;
 readonly firstRecorded:string;
 readonly secondRecorded:string;
 readonly firstState:string;
 readonly secondState:string;
 readonly firstReviewedFamilies:number;
 readonly secondReviewedFamilies:number;
 readonly firstConflicts:number;
 readonly secondConflicts:number;
 readonly recordedLabelsDiffer:boolean;
 readonly findingsDiffer:boolean;
}
export interface CrossVariantResearchComparison {
 readonly firstId:string;
 readonly secondId:string;
 readonly rows:readonly CrossVariantEvidenceRow[];
 readonly hypotheses:readonly string[];
 readonly sharedClass:boolean|null;
 readonly clinicalEquivalence:false;
 readonly recommendationProvided:false;
 readonly interpretation:string;
}
const idPattern=/^[1-9][0-9]{0,17}$/;
const label=(value:string|null):string=>value??'not-recorded';
export function compareCrossVariantEvidence(
 first:MultiTherapyResearchReport,second:MultiTherapyResearchReport,
 firstClass:string|null,secondClass:string|null
):CrossVariantResearchComparison{
 if(!idPattern.test(first.variantId)||!idPattern.test(second.variantId)||
  first.variantId===second.variantId||first.assessedTherapies.length!==5||
  second.assessedTherapies.length!==5||
  first.sourceState!=='loaded-verified-catalog'||second.sourceState!=='loaded-verified-catalog'||
  first.scope!=='variant-research-only'||second.scope!=='variant-research-only'||
  new Set(first.assessedTherapies.map(t=>t.therapy)).size!==5||
  new Set(second.assessedTherapies.map(t=>t.therapy)).size!==5)
  throw new Error('Incomplete or mismatched cross-variant evidence snapshots');
 const secondMap=new Map(second.assessedTherapies.map(t=>[t.therapy,t]));
 const rows=first.assessedTherapies.map(a=>{
  const b=secondMap.get(a.therapy);
  if(!b)throw new Error('Five-therapy research categories do not align');
  return Object.freeze({
   therapy:a.therapy,firstRecorded:label(a.recordedResponse),
   secondRecorded:label(b.recordedResponse),
   firstState:a.state,secondState:b.state,
   firstReviewedFamilies:a.sourceAssessment.verifiedStudyFamilies,
   secondReviewedFamilies:b.sourceAssessment.verifiedStudyFamilies,
   firstConflicts:a.conflicts.length,secondConflicts:b.conflicts.length,
   recordedLabelsDiffer:a.recordedResponse!==b.recordedResponse,
   findingsDiffer:a.sourceAssessment.direction!==b.sourceAssessment.direction
  });
 });
 const sharedClass=firstClass?.trim()&&secondClass?.trim()?
  firstClass.trim().toUpperCase()===secondClass.trim().toUpperCase():null;
 const hypotheses:string[]=[];
 for(const row of rows){
  if(row.recordedLabelsDiffer)hypotheses.push(
   row.therapy+': investigate why historical response categories differ between the two variant records; retrieve variant-specific source evidence.'
  );
  if(row.findingsDiffer&&(row.firstReviewedFamilies||row.secondReviewedFamilies))
   hypotheses.push(row.therapy+': investigate differences in independently reviewed findings, with genotype, model and endpoint held explicit.');
  if(row.firstConflicts||row.secondConflicts)
   hypotheses.push(row.therapy+': reconcile unresolved source disagreements separately before cross-variant interpretation.');
  if(row.firstReviewedFamilies===0||row.secondReviewedFamilies===0)
   hypotheses.push(row.therapy+': examine incomplete source-register coverage; zero reviewed families is not biological non-response.');
 }
 if(sharedClass===true)hypotheses.unshift(
  'Shared recorded functional class: investigate any mechanism-level similarities in original experimental studies; class alone cannot establish equivalence.'
 );
 return Object.freeze({
  firstId:first.variantId,secondId:second.variantId,rows:Object.freeze(rows),
  hypotheses:Object.freeze([...new Set(hypotheses)]),
  sharedClass,clinicalEquivalence:false as const,recommendationProvided:false as const,
  interpretation:'Independent, variant-specific registers are compared descriptively. No cross-variant transfer of efficacy, regulatory eligibility, clinical pathogenicity, or patient response is performed.'
 });
}
