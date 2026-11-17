import type {CuratedSourceClaim,CuratedClaimPayload} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {validSourceClaimPayload} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {MechanismAnnotationDraft} from './mechanismAnnotationDraft';

/** Readiness is about what is recorded, not whether the research finding is true.
 * No medical or molecular conclusions follow from any readiness score.
 */
export interface SourceSubmissionReadiness {
 readonly linkedReference:boolean;
 readonly exactStudyFamily:boolean;
 readonly sourceLocator:boolean;
 readonly scientificRationale:boolean;
 readonly validStructuredContext:boolean;
 readonly canSubmit:boolean;
 readonly instructions:readonly string[];
}
export function sourceSubmissionReadiness(variantId:string,payload:CuratedClaimPayload,
 references:readonly LiveEvidenceReference[]):SourceSubmissionReadiness{
 const linkedReference=references.some(r=>r.variantId===variantId&&r.id===payload.referenceId);
 const exactStudyFamily=/^[A-Za-z0-9][A-Za-z0-9._:-]{2,119}$/.test(payload.studyFamilyId);
 const sourceLocator=payload.locator.trim().length>=8&&payload.locator.trim().length<=240;
 const scientificRationale=payload.rationale.trim().length>=20&&payload.rationale.trim().length<=900;
 const validStructuredContext=validSourceClaimPayload(variantId,payload,references
  .filter(r=>r.variantId===variantId).map(r=>r.id));
 const instructions:string[]=[];
 if(!linkedReference)instructions.push('Choose a real linked publication for this exact variant');
 if(!exactStudyFamily)instructions.push('Specify the underlying study family or source accession');
 if(!sourceLocator)instructions.push('Locate the finding in a figure, table or paragraph');
 if(!scientificRationale)instructions.push('Explain the source finding and its assay or clinical context');
 if(!validStructuredContext&&linkedReference&&exactStudyFamily&&sourceLocator&&scientificRationale)
  instructions.push('Check endpoint units, sampling uncertainty, genotype scope and population fields');
 return Object.freeze({
  linkedReference,exactStudyFamily,sourceLocator,scientificRationale,
  validStructuredContext,canSubmit:validStructuredContext,
  instructions:Object.freeze(instructions)
 });
}
export interface ReviewHandoffSummary{
 readonly pendingSourceClaims:number;
 readonly sourceAwaitingFirst:number;
 readonly sourceAwaitingSecond:number;
 readonly sourceAwaitingOtherReviewer:number;
 readonly approvedSourceClaims:number;
 readonly pendingMolecularClaims:number;
 readonly molecularAwaitingFirst:number;
 readonly molecularAwaitingSecond:number;
 readonly molecularAwaitingOtherReviewer:number;
 readonly approvedMolecularClaims:number;
 readonly blockedMolecularClaims:number;
 readonly sourceLinkedEvidenceRequired:boolean;
}
const verified=(c:CuratedSourceClaim)=>c.status==='approved'&&c.reviewCount===2&&
 c.reviewSeals.length===2&&c.reviewSeals[0]!==c.reviewSeals[1]&&Boolean(c.reviewedAt);
const verifiedMechanism=(m:MolecularReviewRecord)=>m.status==='approved'&&
 m.reviewCount===2&&m.reviewSeals.length===2&&m.reviewSeals[0]!==m.reviewSeals[1]&&
 m.reviewAudit.length===2&&m.reviewAudit.every(r=>r.decision==='approve');
export function researchReviewHandoff(input:{
 variantId:string;sourceClaims:readonly CuratedSourceClaim[];
 molecularClaims:readonly MolecularReviewRecord[];
}):ReviewHandoffSummary{
 const {variantId,sourceClaims,molecularClaims}=input;
 if(!/^[1-9][0-9]{0,17}$/.test(variantId)||
  sourceClaims.length>200||molecularClaims.length>200||
  sourceClaims.some(c=>c.variantId!==variantId)||
  molecularClaims.some(m=>m.variantId!==variantId)||
  new Set(sourceClaims.map(c=>c.id)).size!==sourceClaims.length||
  new Set(molecularClaims.map(m=>m.id)).size!==molecularClaims.length)
  throw new Error('Invalid review handoff inventory');
 const active=sourceClaims.filter(c=>verified(c));
 if(sourceClaims.some(c=>c.status==='approved'&&!verified(c))||
  molecularClaims.some(m=>m.status==='approved'&&!verifiedMechanism(m)))
  throw new Error('Unverified independent scientific review');
 const pendingSources=sourceClaims.filter(c=>c.status==='pending');
 const pendingMolecular=molecularClaims.filter(m=>m.status==='pending');
 const blockedMolecular=molecularClaims.filter(m=>m.status==='approved'&&
  !active.some(c=>c.id===m.sourceClaimId));
 return Object.freeze({
  pendingSourceClaims:pendingSources.length,
  sourceAwaitingFirst:pendingSources.filter(c=>c.reviewCount===0).length,
  sourceAwaitingSecond:pendingSources.filter(c=>c.reviewCount===1).length,
  sourceAwaitingOtherReviewer:pendingSources.filter(c=>c.reviewCount===1&&!c.canReview).length,
  approvedSourceClaims:active.length,
  pendingMolecularClaims:pendingMolecular.length,
  molecularAwaitingFirst:pendingMolecular.filter(m=>m.reviewCount===0).length,
  molecularAwaitingSecond:pendingMolecular.filter(m=>m.reviewCount===1).length,
  molecularAwaitingOtherReviewer:pendingMolecular.filter(m=>m.reviewCount===1&&!m.canReview).length,
  approvedMolecularClaims:molecularClaims.filter(m=>verifiedMechanism(m)&&
   active.some(c=>c.id===m.sourceClaimId)).length,
  blockedMolecularClaims:blockedMolecular.length,
  sourceLinkedEvidenceRequired:active.length===0
 });
}
export interface VerifiedScientificExport{
 readonly format:'neumuacfq-research-audit-v1';
 readonly generatedAt:string;
 readonly variantId:string;
 readonly decisionUse:'research-only-not-clinical';
 readonly approvedSources:readonly {
  readonly claimId:string;readonly seriesId:string;readonly revision:number;
  readonly therapy:string;readonly finding:string;readonly studyFamilyId:string;
  readonly sourceId:number;readonly sourceTitle:string;readonly sourceUrl:string;
  readonly locator:string;readonly method:string;readonly scope:string;
  readonly endpoint:CuratedSourceClaim['endpoint'];
  readonly studyStats:CuratedSourceClaim['studyStats'];
  readonly studyIdentity:CuratedSourceClaim['studyIdentity'];
  readonly reviewSeals:readonly string[];
 }[];
 readonly approvedMolecularInterpretations:readonly {
  readonly recordId:string;readonly revision:number;readonly sourceClaimId:string;
  readonly categories:readonly string[];readonly interpretation:string;
  readonly statement:string;readonly experimentalContext:string;
  readonly exactLocator:string;readonly limitations:string;
  readonly reviewSeals:readonly string[];
  readonly reviewerRationales:readonly {readonly decision:string;readonly note:string;readonly at:string}[];
 }[];
 readonly pendingExcluded:{readonly sourceClaims:number;readonly molecularClaims:number};
 readonly warning:string;
}
/** Export only verified approved revisions and original URLs; pending drafts
 * are *counted* but never passed through as evidence.
 * A molecular interpretation is omitted if its source loses approval.
 */
export function makeVerifiedScientificExport(input:{
 variantId:string;
 claims:readonly CuratedSourceClaim[];
 molecular:readonly MolecularReviewRecord[];
 references:readonly LiveEvidenceReference[];
 generatedAt:string;
}):VerifiedScientificExport{
 const {variantId,claims,molecular,references,generatedAt}=input;
 const summary=researchReviewHandoff({variantId,sourceClaims:claims,molecularClaims:molecular});
 if(references.length>200||references.some(r=>r.variantId!==variantId)||
  new Set(references.map(r=>r.id)).size!==references.length||
  !Number.isFinite(Date.parse(generatedAt)))
  throw new Error('Incomplete scientific source inventory or invalid export timestamp');
 const refs=new Map(references.map(r=>[r.id,r]));
 const approved=claims.filter(verified);
 if(new Set(approved.map(c=>c.seriesId)).size!==approved.length)
  throw new Error('Concurrent approved source revisions');
 if(approved.some(c=>!refs.has(c.referenceId)))
  throw new Error('An approved source claim has no original publication');
 const approvedMolecular=molecular.filter(m=>verifiedMechanism(m)&&
  approved.some(c=>c.id===m.sourceClaimId));
 if(new Set(approvedMolecular.map(m=>m.seriesId)).size!==approvedMolecular.length)
  throw new Error('Concurrent approved molecular revisions');
 return Object.freeze({
  format:'neumuacfq-research-audit-v1',
  generatedAt,variantId,decisionUse:'research-only-not-clinical',
  approvedSources:Object.freeze(approved.map(c=>{
   const source=refs.get(c.referenceId)!;
   return Object.freeze({
    claimId:c.id,seriesId:c.seriesId,revision:c.revision,therapy:c.therapy,
    finding:c.finding,studyFamilyId:c.studyFamilyId,sourceId:c.referenceId,
    sourceTitle:source.title,sourceUrl:source.url,locator:c.locator,
    method:c.method,scope:c.scope,endpoint:c.endpoint,studyStats:c.studyStats,
    studyIdentity:c.studyIdentity,reviewSeals:Object.freeze([...c.reviewSeals])
   });
  })),
  approvedMolecularInterpretations:Object.freeze(approvedMolecular.map(m=>Object.freeze({
   recordId:m.id,revision:m.revision,sourceClaimId:m.sourceClaimId,
   categories:Object.freeze([...m.categories]),interpretation:m.interpretation,
   statement:m.statement,experimentalContext:m.experimentalContext,
   exactLocator:m.exactLocator,limitations:m.limitations,
   reviewSeals:Object.freeze([...m.reviewSeals]),
   reviewerRationales:Object.freeze(m.reviewAudit.map(r=>Object.freeze({...r})))
  }))),
  pendingExcluded:Object.freeze({
   sourceClaims:summary.pendingSourceClaims,molecularClaims:summary.pendingMolecularClaims
  }),
  warning:'This export records independently reviewed source interpretations, not proven molecular causality, clinical response, genotype equivalence or treatment eligibility.'
 });
}
export function portableScientificExport(bundle:VerifiedScientificExport):string{
 return JSON.stringify(bundle,null,2);
}
