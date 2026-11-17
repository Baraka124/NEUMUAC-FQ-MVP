import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** Review queues are presentation-only projections of server-issued
 * canReview and authenticated evidence; authorization stays in the RPC. */
export type ReviewQueueScope='actionable'|'pending'|'approved'|'history'|'all';
export type ReviewItemKind='source'|'molecular';
export interface ReviewQueueItem{
 readonly id:string;
 readonly variantId:string;
 readonly kind:ReviewItemKind;
 readonly status:string;
 readonly revision:number;
 readonly reviewCount:number;
 readonly canReview:boolean;
 readonly submittedByMe:boolean;
 readonly sourceClaimId:string;
 readonly referenceId:number|null;
 readonly label:string;
}
export interface ProvenancePath{
 readonly variantId:string;
 readonly molecularRecordId:string;
 readonly molecularStatus:string;
 readonly sourceClaimId:string;
 readonly sourceStatus:'approved'|'pending'|'rejected'|'withdrawn'|'superseded'|'missing';
 readonly referenceId:number|null;
 readonly originalTitle:string|null;
 readonly originalUrl:string|null;
 readonly studyFamilyId:string|null;
 readonly sourceLocator:string|null;
 readonly sourceReady:boolean;
 readonly mechanismApprovedAndLinked:boolean;
 readonly limitations:readonly string[];
}
const validId=/^[1-9][0-9]{0,17}$/;
export function reviewQueueItems(input:{
 variantId:string;claims:readonly CuratedSourceClaim[];
 mechanisms:readonly MolecularReviewRecord[];
}):readonly ReviewQueueItem[]{
 const {variantId,claims,mechanisms}=input;
 if(!validId.test(variantId)||claims.length>200||mechanisms.length>200||
  claims.some(c=>c.variantId!==variantId)||
  mechanisms.some(m=>m.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(mechanisms.map(m=>m.id)).size!==mechanisms.length)
  throw new Error('Incomplete or cross-variant review queue');
 const items:ReviewQueueItem[]=[
  ...claims.map(c=>Object.freeze({
   id:c.id,variantId,kind:'source' as const,status:c.status,
   revision:c.revision,reviewCount:c.reviewCount,canReview:c.canReview,
   submittedByMe:c.submittedByMe,sourceClaimId:c.id,referenceId:c.referenceId,
   label:c.studyFamilyId
  })),
  ...mechanisms.map(m=>Object.freeze({
   id:m.id,variantId,kind:'molecular' as const,status:m.status,
   revision:m.revision,reviewCount:m.reviewCount,canReview:m.canReview,
   submittedByMe:m.submittedByMe,sourceClaimId:m.sourceClaimId,
   referenceId:null,label:m.categories.join(' / ')
  }))
 ];
 return Object.freeze(items);
}
export function filterReviewQueue<T extends ReviewQueueItem>(
 rows:readonly T[],scope:ReviewQueueScope
):readonly T[]{
 if(!['actionable','pending','approved','history','all'].includes(scope))
  throw new Error('Invalid review queue scope');
 return Object.freeze(rows.filter(row=>scope==='all'?true:
  scope==='actionable'?row.status==='pending'&&row.canReview:
  scope==='pending'?row.status==='pending':
  scope==='approved'?row.status==='approved':
  !['pending','approved'].includes(row.status)));
}
/** Connect exact reviewed source claim, original bibliography and molecular
 * revision without inheriting source approval as molecular approval. */
export function molecularProvenancePath(input:{
 mechanism:MolecularReviewRecord;
 claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}):ProvenancePath{
 const {mechanism,claims,references}=input;
 if(!validId.test(mechanism.variantId)||claims.length>200||references.length>200||
  claims.some(c=>c.variantId!==mechanism.variantId)||
  references.some(r=>r.variantId!==mechanism.variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Unverified provenance scope');
 const source=claims.find(c=>c.id===mechanism.sourceClaimId);
 const original=references.find(r=>r.id===source?.referenceId);
 const sourceReady=!!source&&source.status==='approved'&&source.reviewCount===2&&
  source.reviewSeals.length===2&&source.reviewSeals[0]!==source.reviewSeals[1]&&
  !!source.reviewedAt&&!!original;
 const mechanismReady=mechanism.status==='approved'&&mechanism.reviewCount===2&&
  mechanism.reviewSeals.length===2&&mechanism.reviewSeals[0]!==mechanism.reviewSeals[1]&&
  mechanism.reviewAudit.length===2&&mechanism.reviewAudit.every(x=>x.decision==='approve');
 const limitations:string[]=[];
 if(!source)limitations.push('Original reviewed source claim is not in the verified inventory');
 if(source&&!original)limitations.push('Original bibliography is not linked in the exact variant dossier');
 if(source&&source.status!=='approved')limitations.push('Underlying source claim is not currently approved');
 if(source&&!sourceReady&&source.status==='approved')
  limitations.push('Underlying source approval has incomplete independent provenance');
 if(!mechanismReady)limitations.push('Molecular interpretation is not independently approved');
 return Object.freeze({
  variantId:mechanism.variantId,molecularRecordId:mechanism.id,
  molecularStatus:mechanism.status,sourceClaimId:mechanism.sourceClaimId,
  sourceStatus:source?.status??'missing',referenceId:source?.referenceId??null,
  originalTitle:original?.title??null,originalUrl:original?.url??null,
  studyFamilyId:source?.studyFamilyId??null,sourceLocator:source?.locator??null,
  sourceReady,mechanismApprovedAndLinked:sourceReady&&mechanismReady,
  limitations:Object.freeze(limitations)
 });
}
