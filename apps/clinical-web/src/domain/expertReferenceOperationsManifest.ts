import type {BlindedReviewBatch,BlindedReferencePacket} from './blindedReferenceProtocol';
import {PUBLISHED_CFTR_REFERENCE_CASES} from './publishedCftrReferenceCases';

/** 14H211 · Human study-operation handoff, NOT submitted expert reviews.
 * Creates one copy-safe work order per independent reviewer slot, plus an
 * adjudication/mapping checklist. Assigned identities are never invented.
 */
export interface ExpertReferenceWorkOrder {
 readonly caseId:string;
 readonly variantId:string;
 readonly pmid:string;
 readonly doi:string;
 readonly reviewSlot:'independent-reviewer-1'|'independent-reviewer-2';
 readonly publicationUrl:string;
 readonly blindedQuestion:string;
 readonly requiredFields:readonly string[];
 readonly reviewerAssigned:false;
 readonly expertResponseRecorded:false;
 readonly evidenceReviewed:false;
}
export interface ExpertReferenceOperationsManifest {
 readonly protocol:'nfq-human-review-handoff-14h211';
 readonly workOrders:readonly ExpertReferenceWorkOrder[];
 readonly sourcePublications:number;
 readonly independentReviewSlots:number;
 readonly independentReviewsCompleted:0;
 readonly adjudicationsCompleted:0;
 readonly mappingAttestationsCompleted:0;
 readonly realWorldExpertValidation:false;
 readonly canReleaseScientificAccuracy:false;
 readonly deploymentReady:false;
 readonly requiredControls:readonly string[];
}
const controls=Object.freeze([
 'Confirm CFTR study-specific staging exists and has no production writes',
 'Verify original publication PMID and exact original source URL',
 'Confirm catalogue variant ID and genotype/complex-allele scope independently',
 'Invite two separate qualified reviewers through authenticated research membership',
 'Keep peer results and platform interpretations blinded during independent extraction',
 'Capture source locator, cohort, intervention, experimental endpoint, comparator, uncertainty and limitations',
 'Resolve every inconsistent source finding or locator through a third independent adjudicator',
 'Map expert source interpretation to a doubly reviewed exact platform claim',
 'Maintain immutable server-side audit history and verified actor/session identity',
 'Preserve unavailable cases in the full denominator; do not infer treatment benefit or accuracy'
]);
export function buildExpertReferenceOperationsManifest(
 batch:BlindedReviewBatch
):ExpertReferenceOperationsManifest {
 if(batch.protocol!=='nfq-independent-cftr-reference-review-v1'||
  batch.independentReviewCompleted!==false||batch.expectedFindings!==null||
  batch.caseCount!==batch.challengePackets.length||batch.caseCount>100)
  throw new Error('Operations require an unreviewed, publication-anchored blinded packet batch');
 const keys=new Set<string>();
 const orders:ExpertReferenceWorkOrder[]=[];
 for(const p of batch.challengePackets){
  const source=PUBLISHED_CFTR_REFERENCE_CASES.find(c=>c.id===p.caseId);
  if(!source||p.pmid!==source.pmid||p.doi!==source.doi||
   p.primaryPublicationUrl!==source.pubmedUrl||p.goldStandardAnswer!==null||
   p.clinicallyActionable!==false||
   p.blinding!=='independent-no-peer-finding-or-platform-verdict')
   throw new Error('Unverifiable or accidentally unblinded expert reference packet');
  const key=p.caseId+':'+p.variantId;
  if(keys.has(key))throw new Error('Repeated reference assignment');
  keys.add(key);
  for(const slot of ['independent-reviewer-1','independent-reviewer-2'] as const){
   orders.push(Object.freeze({
    caseId:p.caseId,variantId:p.variantId,pmid:p.pmid,doi:p.doi,
    reviewSlot:slot,publicationUrl:p.primaryPublicationUrl,
    blindedQuestion:p.reviewQuestion,requiredFields:p.requiredExtractionFields,
    reviewerAssigned:false as const,expertResponseRecorded:false as const,
    evidenceReviewed:false as const
   }));
  }
 }
 orders.sort((a,b)=>a.pmid.localeCompare(b.pmid)||
  a.variantId.localeCompare(b.variantId)||a.reviewSlot.localeCompare(b.reviewSlot));
 return Object.freeze({
  protocol:'nfq-human-review-handoff-14h211' as const,
  workOrders:Object.freeze(orders),sourcePublications:keys.size,
  independentReviewSlots:orders.length,
  independentReviewsCompleted:0 as const,adjudicationsCompleted:0 as const,
  mappingAttestationsCompleted:0 as const,
  realWorldExpertValidation:false as const,canReleaseScientificAccuracy:false as const,
  deploymentReady:false as const,requiredControls:controls
 });
}
