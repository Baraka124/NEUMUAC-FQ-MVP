import {PUBLISHED_CFTR_REFERENCE_CASES} from './publishedCftrReferenceCases';

/** 14H207 · Publication-first, blinded expert challenge material.
 * Packet metadata is an invitation to review genuine primary publications,
 * never a gold-standard answer, clinical interpretation or patient record.
 */
export interface BlindedReferenceAssignment {
 readonly caseId:string;
 /** Exact existing database ID, verified separately by an authorized curator. */
 readonly variantId:string;
 readonly curatorVerifiedVariantIdentity:boolean;
}
export interface BlindedReferencePacket {
 readonly protocol:'nfq-independent-cftr-reference-review-v1';
 readonly caseId:string;
 readonly variantId:string;
 readonly pmid:string;
 readonly doi:string;
 readonly primaryPublicationUrl:string;
 readonly observedVariantLabel:string;
 readonly reviewQuestion:string;
 readonly blinding:'independent-no-peer-finding-or-platform-verdict';
 readonly requiredExtractionFields:readonly string[];
 readonly nonInference:readonly string[];
 readonly goldStandardAnswer:null;
 readonly publicationValidation:'bibliography-anchor-not-independent-scientific-validation';
 readonly clinicallyActionable:false;
}
export interface BlindedReviewBatch {
 readonly protocol:'nfq-independent-cftr-reference-review-v1';
 readonly caseCount:number;
 readonly challengePackets:readonly BlindedReferencePacket[];
 readonly expectedFindings:null;
 readonly independentReviewCompleted:false;
}
const canonical=/^[1-9][0-9]{0,17}$/;
const fields=Object.freeze([
 'Exact source figure, table, or page locator',
 'Study design, experimental model, and cohort',
 'Exact two-allele genotype or complex-allele context',
 'Reported endpoint, statistic, units, comparator, and timepoint',
 'What the source actually reports versus reviewer interpretation',
 'Relevant limitations, uncertainty, and contradictory results',
 'Whether an individual-allele or patient-level inference is unsupported'
]);
export function prepareBlindedReferenceBatch(
 assignments:readonly BlindedReferenceAssignment[]
):BlindedReviewBatch {
 if(assignments.length>100)throw new Error('Blinded reference batch exceeds supported case count');
 const seen=new Set<string>();
 const packets:BlindedReferencePacket[]=[];
 for(const a of assignments){
  const publication=PUBLISHED_CFTR_REFERENCE_CASES.find(x=>x.id===a.caseId);
  if(!publication||!canonical.test(a.variantId)||a.curatorVerifiedVariantIdentity!==true)
   throw new Error('Primary paper and manually verified internal catalogue variant are required');
  const key=a.caseId+':'+a.variantId;
  if(seen.has(key))throw new Error('Duplicate scientific challenge');
  seen.add(key);
  packets.push(Object.freeze({
   protocol:'nfq-independent-cftr-reference-review-v1' as const,
   caseId:a.caseId,variantId:a.variantId,pmid:publication.pmid,
   doi:publication.doi,primaryPublicationUrl:publication.pubmedUrl,
   observedVariantLabel:publication.variantLabel,
   reviewQuestion:publication.humanReviewQuestion,
   blinding:'independent-no-peer-finding-or-platform-verdict' as const,
   requiredExtractionFields:fields,
   nonInference:publication.nonInference,
   goldStandardAnswer:null,
   publicationValidation:'bibliography-anchor-not-independent-scientific-validation' as const,
   clinicallyActionable:false as const
  }));
 }
 packets.sort((a,b)=>a.pmid.localeCompare(b.pmid)||a.variantId.localeCompare(b.variantId));
 return Object.freeze({
  protocol:'nfq-independent-cftr-reference-review-v1' as const,
  caseCount:packets.length,challengePackets:Object.freeze(packets),
  expectedFindings:null,independentReviewCompleted:false as const
 });
}
