import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {molecularProvenancePath} from './researchReviewQueue';

/** Scientific reviewer rubric attached to the existing authenticated
 * independent molecular approval workflow. This local form cannot attest
 * for either reviewer: the server accepts two distinct authorized accounts.
 * A structured approval is a reviewed interpretation, never proof of causality.
 */
export interface IndependentScientificAppraisal {
 readonly sourceAlignment:'unassessed'|'supported'|'unsupported'|'uncertain';
 readonly assayContext:'unassessed'|'explicit'|'insufficient';
 readonly genotypeScope:'unassessed'|'explicit'|'ambiguous';
 readonly replication:'unassessed'|'independently-reported'|'not-established';
 readonly contradictions:'unassessed'|'discussed'|'unresolved'|'not-reported';
 readonly limitations:'unassessed'|'explicit'|'insufficient';
 readonly rationale:string;
}
export type AppraisalDecision='approve'|'reject';
export const EMPTY_SCIENTIFIC_APPRAISAL:IndependentScientificAppraisal=Object.freeze({
 sourceAlignment:'unassessed',assayContext:'unassessed',
 genotypeScope:'unassessed',replication:'unassessed',
 contradictions:'unassessed',limitations:'unassessed',rationale:''
});
export interface AppraisalReadiness {
 readonly complete:boolean;
 readonly approvalEligible:boolean;
 readonly reasons:readonly string[];
 readonly clinicalDecisionProvided:false;
}
const control=/[\u0000-\u001f\u007f]/;
const fields=['sourceAlignment','assayContext','genotypeScope','replication',
 'contradictions','limitations'] as const;
const alternatives:Record<typeof fields[number],readonly string[]>={
 sourceAlignment:['supported','unsupported','uncertain'],
 assayContext:['explicit','insufficient'],
 genotypeScope:['explicit','ambiguous'],
 replication:['independently-reported','not-established'],
 contradictions:['discussed','unresolved','not-reported'],
 limitations:['explicit','insufficient']
};
export function scientificAppraisalReadiness(
 assessment:IndependentScientificAppraisal
):AppraisalReadiness {
 const reasons:string[]=[];
 for(const field of fields){
  if(!alternatives[field].includes(String(assessment[field])))
   reasons.push('Assess '+field+' against the original publication');
 }
 if(typeof assessment.rationale!=='string'||
  assessment.rationale.trim()!==assessment.rationale||
  assessment.rationale.length<20||assessment.rationale.length>400||
  control.test(assessment.rationale))
  reasons.push('Provide a specific 20–400 character independent scientific rationale');
 const complete=reasons.length===0;
 if(assessment.sourceAlignment!=='supported')
  reasons.push('Source support is not established; approval prohibited');
 if(assessment.assayContext!=='explicit')
  reasons.push('Experimental assay and model context remain insufficient');
 if(assessment.genotypeScope!=='explicit')
  reasons.push('Exact tested variant or genotype scope is unresolved');
 if(assessment.contradictions==='unresolved')
  reasons.push('Conflicting evidence remains unresolved for this interpretation');
 if(assessment.limitations!=='explicit')
  reasons.push('Research limitations were not explicitly appraised');
 return Object.freeze({
  complete,approvalEligible:complete&&
   assessment.sourceAlignment==='supported'&&
   assessment.assayContext==='explicit'&&
   assessment.genotypeScope==='explicit'&&
   assessment.contradictions!=='unresolved'&&
   assessment.limitations==='explicit',
  reasons:Object.freeze(reasons),clinicalDecisionProvided:false as const
 });
}
/** The server persists this checklist inside a reviewer rationale and
 * independently enforces reviewer role, no self-review, two different
 * reviewer identities, revision and source access.
 */
export function scientificAppraisalReviewNote(input:{
 record:MolecularReviewRecord;
 assessment:IndependentScientificAppraisal;
 decision:AppraisalDecision;
 claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}):string{
 const {record,assessment,decision,claims,references}=input;
 if(record.status!=='pending'||!record.canReview)
  throw new Error('Only an authenticated independent reviewer may adjudicate a pending molecular revision');
 const provenance=molecularProvenancePath({mechanism:record,claims,references});
 if(!provenance.sourceReady||provenance.sourceClaimId!==record.sourceClaimId||
  !provenance.originalUrl)
  throw new Error('An independently reviewed original publication is required');
 const readiness=scientificAppraisalReadiness(assessment);
 if(!readiness.complete)
  throw new Error('All independent scientific appraisal criteria and rationale are required');
 if(decision==='approve'&&!readiness.approvalEligible)
  throw new Error('This molecular interpretation does not meet the review-approval criteria');
 const note=[
  'NFQ-scientific-appraisal-v1',
  'Decision='+decision,
  'Source='+record.sourceClaimId,
  'Revision='+record.revision,
  'Alignment='+assessment.sourceAlignment,
  'Assay='+assessment.assayContext,
  'Genotype='+assessment.genotypeScope,
  'Replication='+assessment.replication,
  'Contradictions='+assessment.contradictions,
  'Limitations='+assessment.limitations,
  'Rationale='+assessment.rationale
 ].join('; ');
 if(note.length>900||control.test(note))throw new Error('Scientific review note exceeds server limits');
 return note;
}
