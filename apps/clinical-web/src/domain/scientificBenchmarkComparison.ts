import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {ExpertBenchmark,ExpertExtraction,ExpertAdjudication} from './expertBenchmarkAdjudication';
import {evaluateExpertBenchmark} from './expertBenchmarkAdjudication';
import {inspectPublishedCase} from './publishedCftrReferenceCases';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** Phase 14H201. This is a research-only agreement check, NOT validation of
 * drug efficacy or biological causality. The mapping must have been independently
 * attested by a trusted reviewer service before being passed to this function.
 */
export interface AttestedBenchmarkMapping {
 readonly caseId:string;
 readonly variantId:string;
 readonly platformClaimId:string;
 readonly expertFinding:'supports'|'does-not-support'|'inconclusive'|'not-assessable';
 readonly claimFinding:'reported-response'|'reported-no-response'|'mixed'|'inconclusive';
 readonly genotypeContext:string;
 readonly endpointCode:string;
 readonly endpointTimepoint:string;
 readonly sourceLocator:string;
 readonly attestedBy:string;
 readonly attestedAt:string;
 readonly mappingVersion:1;
}
export type ScientificComparisonStatus=
 'missing-expert-reviews'|'unresolved-disagreement'|'missing-source-claim'|
 'incompatible-evidence'|'indeterminate'|'agreement'|'disagreement';
export interface ScientificComparison {
 readonly status:ScientificComparisonStatus;
 readonly caseId:string;
 readonly platformClaimId:string|null;
 readonly discrepancies:readonly string[];
 readonly expertFinding:string|null;
 readonly platformFinding:string|null;
 readonly scientificAccuracyValidated:false;
 readonly usableForClinicalDecision:false;
}
const trim=(s:string)=>s.trim().toLowerCase().replace(/\s+/g,' ');
const exact=(a:string,b:string)=>trim(a)===trim(b);
const claimed=(value:string)=>value.length>=3&&value.length<=240&&value.trim()===value;
/** No numerical outcome, cohort-effect size or therapy recommendation is ever computed. */
export function compareExpertWithPlatform(input:{
 caseId:string;variantId:string;
 references:readonly LiveEvidenceReference[];
 claims:readonly CuratedSourceClaim[];
 extracts:readonly ExpertExtraction[];
 adjudication?:ExpertAdjudication|null;
 mapping?:AttestedBenchmarkMapping|null;
}):ScientificComparison {
 const benchmark:ExpertBenchmark=evaluateExpertBenchmark(input);
 const base={caseId:input.caseId,scientificAccuracyValidated:false as const,
  usableForClinicalDecision:false as const};
 const answer=(status:ScientificComparisonStatus,discrepancies:readonly string[],
  platformClaimId:string|null=null,platformFinding:string|null=null):ScientificComparison=>
  Object.freeze({...base,status,platformClaimId,platformFinding,
   expertFinding:benchmark.expertFinding,
   discrepancies:Object.freeze([...discrepancies])});
 if(input.extracts.length<2)return answer('missing-expert-reviews',['Two independent expert extractions not present']);
 if(benchmark.disposition==='needs-adjudication'||benchmark.disposition==='awaiting-claim-mapping'&&!input.mapping)
  return answer('unresolved-disagreement',['A disagreement or adjudicated claim mapping remains unresolved']);
 if(!input.mapping)return answer('missing-source-claim',['No attested exact source-claim mapping']);
 const m=input.mapping;
 if(m.caseId!==input.caseId||m.variantId!==input.variantId||m.mappingVersion!==1||
  !claimed(m.platformClaimId)||!claimed(m.sourceLocator)||!claimed(m.attestedBy)||
  !Number.isFinite(Date.parse(m.attestedAt))||
  !claimed(m.genotypeContext)||!claimed(m.endpointCode)||!claimed(m.endpointTimepoint))
  throw new Error('Malformed scientific benchmark mapping');
 if(benchmark.expertFinding===null||benchmark.expertFinding!==m.expertFinding)
  return answer('incompatible-evidence',['Mapped expert interpretation does not match the adjudicated reference']);
 if(input.extracts.some(e=>exact(e.reviewerId,m.attestedBy))||
  (input.adjudication&&exact(input.adjudication.adjudicatorId,m.attestedBy)))
  return answer('incompatible-evidence',['Mapping attestation is not independent of source reviewers']);
 const inventory=inspectPublishedCase({caseId:input.caseId,variantId:input.variantId,
  references:input.references,claims:input.claims});
 const claim=input.claims.find(c=>c.id===m.platformClaimId);
 if(!claim||!inventory.matchedScopeClaimIds.includes(claim.id))
  return answer('missing-source-claim',['Mapped claim is not independently source-reviewed and scope-compatible']);
 const problems:string[]=[];
 if(claim.finding!==m.claimFinding)problems.push('Approved platform finding differs from mapping snapshot');
 if(!claim.endpoint)problems.push('Approved source claim has no structured experimental endpoint');
 else{
  if(!exact(claim.endpoint.code,m.endpointCode))problems.push('Experimental endpoint differs');
  if(!exact(claim.endpoint.timepoint,m.endpointTimepoint))problems.push('Endpoint timepoint differs');
 }
 if(!input.extracts.every(e=>exact(e.genotypeContext,m.genotypeContext)))
  problems.push('Expert genotype descriptions do not match mapping');
 if(!input.extracts.every(e=>exact(e.sourceLocator,m.sourceLocator)))
  problems.push('Source locators do not match mapping');
 if(problems.length)return answer('incompatible-evidence',problems,claim.id,claim.finding);
 // Only the two directionally comparable qualitative findings are contrasted.
 // "Supports" describes a reported observation, not a proven treatment benefit.
 const toDirection=(v:string):number|null=>
  v==='supports'||v==='reported-response'?1:
  v==='does-not-support'||v==='reported-no-response'?-1:null;
 const expertDirection=toDirection(m.expertFinding);
 const sourceDirection=toDirection(m.claimFinding);
 if(expertDirection===null||sourceDirection===null)
  return answer('indeterminate',['Source finding is mixed, inconclusive, or not assessable'],claim.id,claim.finding);
 return answer(expertDirection===sourceDirection?'agreement':'disagreement',[],
  claim.id,claim.finding);
}
