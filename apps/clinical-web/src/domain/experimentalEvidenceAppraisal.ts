import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CoreModulatorId} from './therapyRegistry';
import {endpointReadiness} from './researchEndpointNormalization';
import {resolveStudyIdentityLinks} from './reportedStudyIdentity';

/** Extraction appraisal, not a quality grade, effect estimate or clinical decision.
 * Independent reports are not proof of independent samples or replication.
 * Only exact-variant, independently reviewed records enter this projection.
 */
export interface ExperimentalEvidenceAppraisal {
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly approvedSourceClaims:number;
 readonly distinctSourceReferences:number;
 readonly studyClusters:number;
 readonly populationModels:readonly string[];
 readonly numericEndpoints:number;
 readonly qualitativeEndpoints:number;
 readonly unextractedEndpoints:number;
 readonly comparatorSpecified:number;
 readonly studyMethods:{readonly clinical:number;readonly inVitro:number;readonly curatedLiterature:number};
 readonly variantScopes:{readonly singleVariant:number;readonly genotypeSpecific:number};
 readonly mechanisticDirectness:'requires-source-specific-appraisal';
 readonly reportedPositiveClusters:number;
 readonly reportedNegativeClusters:number;
 readonly mixedOrInconclusiveClusters:number;
 readonly directionallyDiscordant:boolean;
 readonly studyLinkConflicts:number;
 readonly proposedReplication:'not-established-by-record-count';
 readonly causalInterpretation:'not-assessed';
 readonly limitations:readonly string[];
}
const ID=/^[1-9][0-9]{0,17}$/;
export function appraiseExperimentalEvidence(input:{
 variantId:string;therapy:CoreModulatorId;
 claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}):ExperimentalEvidenceAppraisal {
 const {variantId,therapy,claims,references}=input;
 if(!ID.test(variantId)||claims.length>200||references.length>200||
  claims.some(c=>c.variantId!==variantId)||references.some(r=>r.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Experimental appraisal requires a consistent exact-variant inventory');
 const approved=claims.filter(c=>c.status==='approved');
 if(new Set(approved.map(c=>c.seriesId)).size!==approved.length||
  approved.some(c=>c.reviewCount!==2||c.reviewSeals.length!==2||
   c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt||
   !references.some(r=>r.id===c.referenceId)))
  throw new Error('Experimental appraisal requires original-source-linked independent review');
 const rows=approved.filter(c=>c.therapy===therapy);
 const links=resolveStudyIdentityLinks(approved.map(c=>({
  claimId:c.id,studyFamilyId:c.studyFamilyId,studyIdentity:c.studyIdentity
 })));
 const groups=new Map<string,CuratedSourceClaim[]>();
 let linkConflicts=0;
 for(const row of rows){
  const link=links.get(row.id);
  if(!link)throw new Error('Study-identity reconciliation incomplete');
  if(link.identityConflict)linkConflicts++;
  groups.set(link.key,[...(groups.get(link.key)??[]),row]);
 }
 const models=[...new Set(rows.map(c=>c.studyIdentity?.populationModel??'not-reported')
  .filter(m=>m!=='not-reported'))].sort();
 let positive=0,negative=0,indeterminate=0;
 for(const family of groups.values()){
  const findings=new Set(family.map(c=>c.finding));
  const hasPositive=findings.has('reported-response');
  const hasNegative=findings.has('reported-no-response');
  if(hasPositive&&hasNegative||findings.has('mixed')||findings.has('inconclusive')||
   !hasPositive&&!hasNegative)indeterminate++;
  else if(hasPositive)positive++;
  else if(hasNegative)negative++;
 }
 const numeric=rows.filter(c=>endpointReadiness(c.endpoint)==='numeric').length;
 const qualitative=rows.filter(c=>endpointReadiness(c.endpoint)==='qualitative').length;
 const limitations:string[]=[];
 if(!rows.length)limitations.push('No independently reviewed source claim in this exact-variant therapy register');
 if(!models.length)limitations.push('Experimental or clinical population model not extracted');
 if(numeric===0)limitations.push('No source-reported numeric endpoint extracted');
 if(linkConflicts)limitations.push('Conflicting study registrations or family identifiers require inspection');
 if(positive&&negative)limitations.push('Opposing reported directions across source clusters require independent reconciliation');
 if(groups.size>1)limitations.push('Multiple source clusters are not proof of experimental replication or independent cohorts');
 return Object.freeze({
  variantId,therapy,approvedSourceClaims:rows.length,
  distinctSourceReferences:new Set(rows.map(c=>c.referenceId)).size,
  studyClusters:groups.size,populationModels:Object.freeze(models),
  numericEndpoints:numeric,qualitativeEndpoints:qualitative,
  unextractedEndpoints:rows.length-numeric-qualitative,
  comparatorSpecified:rows.filter(c=>c.endpoint&&c.endpoint.comparator!=='not-reported').length,
  studyMethods:Object.freeze({
   clinical:rows.filter(c=>c.method==='clinical-study').length,
   inVitro:rows.filter(c=>c.method==='in-vitro-study').length,
   curatedLiterature:rows.filter(c=>c.method==='curated-literature').length
  }),
  variantScopes:Object.freeze({
   singleVariant:rows.filter(c=>c.scope==='single-variant').length,
   genotypeSpecific:rows.filter(c=>c.scope==='genotype-specific').length
  }),
  mechanisticDirectness:'requires-source-specific-appraisal' as const,
  reportedPositiveClusters:positive,reportedNegativeClusters:negative,
  mixedOrInconclusiveClusters:indeterminate,
  directionallyDiscordant:positive>0&&negative>0,
  studyLinkConflicts:linkConflicts,
  proposedReplication:'not-established-by-record-count' as const,
  causalInterpretation:'not-assessed' as const,
  limitations:Object.freeze(limitations)
 });
}
