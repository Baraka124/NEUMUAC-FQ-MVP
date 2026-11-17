import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {THERAPIES,type CoreModulatorId} from './therapyRegistry';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import {MECHANISM_CATEGORIES,type MechanismAnnotationDraft,type MechanismCategory} from './mechanismAnnotationDraft';

/** Gap means "not represented by an approved structured source observation
 * in the *loaded register*". It never means the biological evidence does not
 * exist or that a therapy is ineffective.
 */
export interface GapMapCell{
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly approvedClaimCount:number;
 readonly uniqueStudyFamilies:number;
 readonly endpointObserved:boolean;
 readonly explicitStudyContext:boolean;
 readonly mechanismProposalCount:number;
 readonly approvedMolecularAnnotations:number;
 readonly categoriesWithDrafts:readonly MechanismCategory[];
 readonly gaps:readonly ('no-reviewed-source-claim'|'endpoint-not-extracted'|'study-context-not-extracted'|'mechanism-not-adjudicated')[];
}
export interface CrossVariantGapMap{
 readonly variantIds:readonly [string,string];
 readonly cells:readonly GapMapCell[];
 readonly mechanismCoverage:readonly {
  readonly category:MechanismCategory;
  readonly label:string;
  readonly firstDraftCount:number;
  readonly secondDraftCount:number;
  readonly verifiedMechanismCount:number;
 }[];
 readonly researchOnly:true;
 readonly interpretation:string;
}
const id=/^[1-9][0-9]{0,17}$/;
function sourceCells(variantId:string,claims:readonly CuratedSourceClaim[],
 references:readonly LiveEvidenceReference[],drafts:readonly MechanismAnnotationDraft[],
 persisted:readonly MolecularReviewRecord[]):GapMapCell[]{
 if(!id.test(variantId)||claims.length>200||references.length>200||
  claims.some(c=>c.variantId!==variantId)||references.some(r=>r.variantId!==variantId)||
  drafts.some(d=>d.variantId!==variantId||d.validationState!=='unreviewed-research-draft')||
  persisted.some(m=>m.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Cross-variant evidence gaps cannot be calculated from an invalid source inventory');
 const refs=new Set(references.map(x=>x.id));
 const approved=claims.filter(c=>c.status==='approved');
 if(new Set(approved.map(c=>c.seriesId)).size!==approved.length||
  approved.some(c=>!refs.has(c.referenceId)||c.reviewCount!==2||
   c.reviewSeals.length!==2||c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt)||
  drafts.some(d=>!approved.some(c=>c.id===d.claimId&&c.referenceId===d.referenceId))||
  persisted.some(m=>m.status==='approved'&&(
   m.reviewCount!==2||m.reviewSeals.length!==2||
   m.reviewSeals[0]===m.reviewSeals[1]||
   !approved.some(c=>c.id===m.sourceClaimId))))
  throw new Error('Mechanism drafts must refer to independently reviewed source claims');
 return THERAPIES.map(({id:therapy})=>{
  const rows=approved.filter(c=>c.therapy===therapy);
  const associated=drafts.filter(d=>rows.some(c=>c.id===d.claimId));
  const adjudicated=persisted.filter(m=>m.status==='approved'&&
   rows.some(c=>c.id===m.sourceClaimId));
  const endpoint=rows.some(c=>c.endpoint?.code!=='not-reported'&&c.endpoint!==null);
  const context=rows.some(c=>c.studyIdentity!==null&&
   c.studyIdentity.populationModel!=='not-reported');
  const gaps:GapMapCell['gaps'][number][]=[];
  if(!rows.length)gaps.push('no-reviewed-source-claim');
  if(!endpoint)gaps.push('endpoint-not-extracted');
  if(!context)gaps.push('study-context-not-extracted');
  // Future mechanism record requires independent mechanism-specific review.
  // A researcher-local draft cannot close a validation gap.
  if(!adjudicated.length)gaps.push('mechanism-not-adjudicated');
  return Object.freeze({
   variantId,therapy,approvedClaimCount:rows.length,
   uniqueStudyFamilies:new Set(rows.map(c=>c.studyFamilyId)).size,
   endpointObserved:endpoint,explicitStudyContext:context,
   mechanismProposalCount:associated.length,
   approvedMolecularAnnotations:adjudicated.length,
   categoriesWithDrafts:Object.freeze([...new Set(associated.flatMap(d=>d.categories))]),
   gaps:Object.freeze(gaps)
  });
 });
}
export function buildCrossVariantGapMap(input:{
 firstId:string;secondId:string;
 firstClaims:readonly CuratedSourceClaim[];secondClaims:readonly CuratedSourceClaim[];
 firstReferences:readonly LiveEvidenceReference[];secondReferences:readonly LiveEvidenceReference[];
 drafts?:readonly MechanismAnnotationDraft[];
 persisted?:readonly MolecularReviewRecord[];
}):CrossVariantGapMap{
 if(!id.test(input.firstId)||!id.test(input.secondId)||input.firstId===input.secondId)
  throw new Error('Two distinct catalogue identities are required');
 const drafts=input.drafts??[];
 const persisted=input.persisted??[];
 if(drafts.length>50||persisted.length>400||
  new Set(persisted.map(m=>m.id)).size!==persisted.length||
  drafts.some(d=>d.variantId!==input.firstId&&d.variantId!==input.secondId)||
  persisted.some(m=>m.variantId!==input.firstId&&m.variantId!==input.secondId))
  throw new Error('Invalid draft scope');
 const first=sourceCells(input.firstId,input.firstClaims,input.firstReferences,drafts.filter(d=>d.variantId===input.firstId));
 const second=sourceCells(input.secondId,input.secondClaims,input.secondReferences,drafts.filter(d=>d.variantId===input.secondId));
 const coverage=MECHANISM_CATEGORIES.map(category=>Object.freeze({
  category:category.id,label:category.label,
  firstDraftCount:drafts.filter(d=>d.variantId===input.firstId&&d.categories.includes(category.id)).length,
  secondDraftCount:drafts.filter(d=>d.variantId===input.secondId&&d.categories.includes(category.id)).length,
  verifiedMechanismCount:persisted.filter(m=>m.status==='approved'&&m.categories.includes(category.id)).length
 }));
 return Object.freeze({
  variantIds:[input.firstId,input.secondId] as const,
  cells:Object.freeze([...first,...second]),
  mechanismCoverage:Object.freeze(coverage),
  researchOnly:true as const,
  interpretation:'Register coverage only. Missing structured claims, endpoints, context or reviewed mechanism annotations do not imply missing biological evidence or absence of drug response. Only independently reviewed and approved molecular revisions can close the mechanism-review gap; local drafts never do.'
 });
}
