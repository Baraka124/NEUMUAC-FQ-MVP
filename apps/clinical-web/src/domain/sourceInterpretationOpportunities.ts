import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import {molecularProvenancePath} from './researchReviewQueue';

export type SourceInterpretationState=
 'awaiting-independent-source-review'|'source-rejected-or-historical'|
 'ready-for-molecular-annotation'|'molecular-review-pending'|
 'independently-approved-molecular-interpretation'|'underlying-source-unverified';
export interface SourceInterpretationOpportunity{
 readonly claimId:string;
 readonly variantId:string;
 readonly studyFamilyId:string;
 readonly therapy:string;
 readonly sourceTitle:string|null;
 readonly sourceUrl:string|null;
 readonly state:SourceInterpretationState;
 readonly pendingMolecularCount:number;
 readonly approvedMolecularCount:number;
 readonly canPropose:boolean;
}
/** This is research workflow coverage, never a mechanism prediction.
 * No candidate mechanism category can be inferred from a therapy label,
 * CFTR classification, study title or absence of annotation.
 */
export function sourceInterpretationOpportunities(input:{
 variantId:string;claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
 mechanisms:readonly MolecularReviewRecord[];
}):readonly SourceInterpretationOpportunity[]{
 const {variantId,claims,references,mechanisms}=input;
 if(!/^[1-9][0-9]{0,17}$/.test(variantId)||claims.length>200||
  mechanisms.length>200||references.length>200||
  claims.some(c=>c.variantId!==variantId)||
  mechanisms.some(m=>m.variantId!==variantId)||
  references.some(r=>r.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(mechanisms.map(m=>m.id)).size!==mechanisms.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Incomplete exact-variant research evidence inventory');
 return Object.freeze(claims.filter(c=>c.status!=='superseded').map(claim=>{
  const reference=references.find(r=>r.id===claim.referenceId);
  const linked=mechanisms.filter(m=>m.sourceClaimId===claim.id);
  const approved=linked.filter(m=>molecularProvenancePath({
   mechanism:m,claims,references
  }).mechanismApprovedAndLinked);
  const pending=linked.filter(m=>m.status==='pending');
  const sourceApproved=claim.status==='approved'&&claim.reviewCount===2&&
   claim.reviewSeals.length===2&&claim.reviewSeals[0]!==claim.reviewSeals[1]&&
   !!claim.reviewedAt&&!!reference;
  const state:SourceInterpretationState=claim.status==='pending'?
   'awaiting-independent-source-review':
   claim.status!=='approved'?'source-rejected-or-historical':
   !sourceApproved?'underlying-source-unverified':
   approved.length?'independently-approved-molecular-interpretation':
   pending.length?'molecular-review-pending':'ready-for-molecular-annotation';
  return Object.freeze({
   claimId:claim.id,variantId,studyFamilyId:claim.studyFamilyId,
   therapy:claim.therapy,sourceTitle:reference?.title??null,
   sourceUrl:reference?.url??null,state,
   pendingMolecularCount:pending.length,
   approvedMolecularCount:approved.length,
   canPropose:sourceApproved
  });
 }));
}
