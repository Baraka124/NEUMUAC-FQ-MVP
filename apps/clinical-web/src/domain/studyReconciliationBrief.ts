import type {EvidenceInvestigation,InvestigationObservation} from './evidenceInvestigation';
import {endpointComparisonKey,endpointDisplayValue} from './researchEndpointNormalization';

/** A non-adjudicative comparison. Only *approved* claims are compared;
 * shared study families do not count as independent replication.
 */
export type PairRelationship='same-study-family'|'endpoint-context-aligned'|
 'different-genotype-or-method'|'incomparable-endpoint';
export interface StudyComparisonPair{
 readonly firstId:string;
 readonly secondId:string;
 readonly relationship:PairRelationship;
 readonly opposingFindings:boolean;
 readonly description:string;
}
export interface StudyReconciliation{
 readonly variantId:string;
 readonly approvedObservations:readonly InvestigationObservation[];
 readonly unapprovedCount:number;
 readonly independentFamilies:number;
 readonly comparisons:readonly StudyComparisonPair[];
 readonly comparablePairs:number;
 readonly opposingComparablePairs:number;
 readonly caution:string;
}
const directional=(f:string)=>f==='reported-response'?'response':
 f==='reported-no-response'?'no-response':'other';
const context=(c:InvestigationObservation):string|null=>endpointComparisonKey(
 c.endpoint,c.scope,c.genotypePair??undefined,c.model
);
function relationship(a:InvestigationObservation,b:InvestigationObservation):PairRelationship{
 if(a.studyFamilyId===b.studyFamilyId)return 'same-study-family';
 const keyA=context(a),keyB=context(b);
 if(keyA&&keyB&&keyA===keyB)return 'endpoint-context-aligned';
 if(a.scope!==b.scope||a.model!==b.model||
  JSON.stringify(a.genotypePair?[...a.genotypePair].sort():null)!==
  JSON.stringify(b.genotypePair?[...b.genotypePair].sort():null))
  return 'different-genotype-or-method';
 return 'incomparable-endpoint';
}
export function reconcileInvestigationStudies(brief:EvidenceInvestigation):StudyReconciliation{
 if(!/^[1-9][0-9]{0,17}$/.test(brief.variantId)||brief.observations.length>200||
  new Set(brief.observations.map(c=>c.id)).size!==brief.observations.length||
  brief.observations.some(c=>c.status==='approved'&&(
   c.reviewCount!==2||c.reviewSeals.length!==2||
   c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt)))
  throw new Error('Unverified investigation evidence snapshot');
 const approved=brief.observations.filter(c=>c.status==='approved');
 const comparisons:StudyComparisonPair[]=[];
 for(let i=0;i<approved.length;i++)for(let j=i+1;j<approved.length;j++){
  const a=approved[i]!,b=approved[j]!;
  const rel=relationship(a,b);
  const opposing=(directional(a.finding)==='response'&&directional(b.finding)==='no-response')||
   (directional(a.finding)==='no-response'&&directional(b.finding)==='response');
  const description=rel==='same-study-family'?
   'Two claims belong to the same study family; not independent replication.':
   rel==='endpoint-context-aligned'?
   'Source-reported endpoint context keys align. Independent source appraisal still required.':
   rel==='different-genotype-or-method'?
   'Genotype scope or observation methods differ; no direct comparison.':
   'Endpoint, comparator, timepoint, statistic or model is not strictly aligned.';
  comparisons.push(Object.freeze({firstId:a.id,secondId:b.id,
   relationship:rel,opposingFindings:opposing,description}));
 }
 return Object.freeze({
  variantId:brief.variantId,approvedObservations:Object.freeze(approved),
  unapprovedCount:brief.observations.length-approved.length,
  independentFamilies:new Set(approved.map(c=>c.studyFamilyId)).size,
  comparisons:Object.freeze(comparisons),
  comparablePairs:comparisons.filter(c=>c.relationship==='endpoint-context-aligned').length,
  opposingComparablePairs:comparisons.filter(c=>c.relationship==='endpoint-context-aligned'&&c.opposingFindings).length,
  caution:'This is a provenance and comparability audit, not a pooled analysis, adjudication, treatment recommendation or evidence of clinical response.'
 });
}
const safe=(v:unknown):string=>String(v??'Not recorded').replace(/[\r\n\t]+/g,' ').trim();
export function createReconciliationBrief(
 investigation:EvidenceInvestigation,reconciliation:StudyReconciliation,
 variantLabel:string
):string{
 if(investigation.variantId!==reconciliation.variantId)throw new Error('Brief variant mismatch');
 const lines=[
  'neumuacFQ — Research evidence investigation brief',
  'Variant: '+safe(variantLabel)+' (catalogue ID '+investigation.variantId+')',
  'Investigation: '+safe(investigation.taskId),
  'Source: authenticated variant-scoped review snapshot; generated brief, not a saved adjudication',
  'Approved claims: '+reconciliation.approvedObservations.length,
  'Pending or nonapproved claims: '+reconciliation.unapprovedCount,
  'Independent study families represented: '+reconciliation.independentFamilies,
  'Strictly comparable endpoint-context pairs: '+reconciliation.comparablePairs,
  'Opposing comparable directional reports: '+reconciliation.opposingComparablePairs,
  '',
  'Source-specific observations'
 ];
 for(const c of investigation.observations){
  lines.push(
   '- Claim '+safe(c.id)+' · '+safe(c.status)+' · '+safe(c.finding),
   '  Source #'+c.referenceId+': '+safe(c.sourceTitle),
   '  Citation: '+safe(c.citationUrl),
   '  Study family: '+safe(c.studyFamilyId)+' · '+safe(c.model)+' · '+safe(c.scope),
   '  Genotype: '+(c.genotypePair?safe(c.genotypePair.join(' / ')):'single variant / unspecified second allele'),
   '  Endpoint: '+(c.endpoint?endpointDisplayValue(c.endpoint):'Not extracted'),
   '  Locator: '+safe(c.locator),
   '  Reviewer attestations: '+c.reviewCount+'/2; approval at '+safe(c.reviewedAt),
   '  Revision audit events visible in source record: '+c.audit.length
  );
 }
 lines.push('','Pairwise reconciliation');
 for(const pair of reconciliation.comparisons){
  lines.push('- '+safe(pair.firstId)+' / '+safe(pair.secondId)+': '+
   pair.relationship+(pair.opposingFindings?' · directional findings oppose':'')+
   ' · '+pair.description);
 }
 lines.push('','Next scientific action: '+safe(investigation.nextAction),
  'Interpretation boundary: '+reconciliation.caution,
  'Any correction must be submitted and independently approved in the existing authenticated source-claim workflow.');
 return lines.join('\n');
}
