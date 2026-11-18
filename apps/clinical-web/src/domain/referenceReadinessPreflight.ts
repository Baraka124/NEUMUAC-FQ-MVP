import type {ExpertRegistryRecord} from '../services/expertRegistryService';
import {inspectExpertWorkflow} from './expertReviewWorkflowAudit';
import type {BenchmarkCaseInput} from './scientificBenchmarkLedger';
import {compareExpertWithPlatform} from './scientificBenchmarkComparison';
import {PUBLISHED_CFTR_REFERENCE_CASES} from './publishedCftrReferenceCases';

/** 14H208–209: reproducible preflight of server-confirmed review results.
 * A provided registry record is NOT proof of a deployed server or a human
 * having reviewed the original paper. Only the trusted caller can establish
 * those facts, after external audit. This module is never a clinical gateway.
 */
export type ReferenceReadinessState=
 'awaiting-independent-reviews'|'awaiting-adjudication'|
 'awaiting-attestation'|'incompatible-source-evidence'|
 'review-records-complete-not-externally-validated';
export interface ReferenceReadinessCase {
 readonly caseId:string;
 readonly variantId:string;
 readonly pmid:string;
 readonly state:ReferenceReadinessState;
 readonly comparison:string;
 readonly blockingReasons:readonly string[];
 readonly externalScientificValidation:false;
 readonly eligibleForClinicalDecision:false;
}
export interface ReferenceReadinessReport {
 readonly protocol:'nfq-reference-preflight-14h209';
 readonly evaluatedCases:number;
 readonly completeReviewChains:number;
 readonly awaitingEvidence:number;
 readonly cases:readonly ReferenceReadinessCase[];
 readonly canCertifyScientificAccuracy:false;
 readonly readyForClinicalDeployment:false;
}
export function preflightScientificReferences(
 inputs:readonly {readonly registry:ExpertRegistryRecord;readonly evidence:BenchmarkCaseInput}[]
):ReferenceReadinessReport {
 if(inputs.length>100)throw new Error('Publication preflight exceeds bounded batch limit');
 const seen=new Set<string>();
 const results:ReferenceReadinessCase[]=[];
 let complete=0;
 for(const {registry,evidence} of inputs){
  if(registry.caseId!==evidence.caseId||registry.variantId!==evidence.variantId)
   throw new Error('Registry and scientific evidence identity mismatch');
  const challenge=PUBLISHED_CFTR_REFERENCE_CASES.find(x=>x.id===registry.caseId);
  if(!challenge)throw new Error('Unknown primary publication');
  const id=registry.caseId+':'+registry.variantId;
  if(seen.has(id))throw new Error('Duplicate reference challenge');
  seen.add(id);
  // Never allow untrusted caller-provided extractions to differ from the
  // registry snapshot that has passed the structural/audit decoder.
  const equal=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
  if(!equal(registry.extracts,evidence.extracts)||
   !equal(registry.adjudication,evidence.adjudication??null)||
   !equal(registry.mapping,evidence.mapping??null))
   throw new Error('Evidence payload differs from registry snapshot');
  const audit=inspectExpertWorkflow(registry);
  const comparison=compareExpertWithPlatform(evidence);
  const reasons:string[]=[];
  if(audit.state!=='mapping-recorded')
   reasons.push('Independent expert review and attested mapping incomplete');
  if(comparison.status!=='agreement'&&comparison.status!=='disagreement')
   reasons.push('Source observations cannot be compared as a reviewed pair');
  // Independently adjudicated source discrepancies remain in the research
  // report even when a mapping exists; no source ambiguity is erased.
  if(audit.disagreements.length)
   reasons.push('Original expert disagreements must remain disclosed');
  const state:ReferenceReadinessState=
   audit.state==='awaiting-first-reviewer'||audit.state==='awaiting-second-reviewer'?
    'awaiting-independent-reviews':
   audit.state==='awaiting-adjudication'?'awaiting-adjudication':
   audit.state!=='mapping-recorded'?'awaiting-attestation':
   comparison.status!=='agreement'&&comparison.status!=='disagreement'?
    'incompatible-source-evidence':'review-records-complete-not-externally-validated';
  if(state==='review-records-complete-not-externally-validated')++complete;
  results.push(Object.freeze({
   caseId:id.split(':')[0]!,variantId:registry.variantId,pmid:challenge.pmid,
   state,comparison:comparison.status,blockingReasons:Object.freeze(reasons),
   externalScientificValidation:false as const,eligibleForClinicalDecision:false as const
  }));
 }
 results.sort((a,b)=>a.pmid.localeCompare(b.pmid)||a.variantId.localeCompare(b.variantId));
 return Object.freeze({
  protocol:'nfq-reference-preflight-14h209' as const,
  evaluatedCases:results.length,completeReviewChains:complete,
  awaitingEvidence:results.length-complete,cases:Object.freeze(results),
  canCertifyScientificAccuracy:false as const,readyForClinicalDeployment:false as const
 });
}
