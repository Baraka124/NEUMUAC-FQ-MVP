import type {EvidenceTriageTask} from './evidenceResearchPriorities';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {PassportSource} from './variantEvidencePassport';

export interface InvestigationObservation {
 readonly id:string;
 readonly referenceId:number;
 readonly sourceTitle:string;
 readonly citationUrl:string;
 readonly status:CuratedSourceClaim['status'];
 readonly therapy:string;
 readonly finding:CuratedSourceClaim['finding'];
 readonly scope:CuratedSourceClaim['scope'];
 readonly genotypePair:readonly [string,string]|null;
 readonly model:CuratedSourceClaim['method'];
 readonly studyFamilyId:string;
 readonly endpoint:CuratedSourceClaim['endpoint'];
 readonly studyStats:CuratedSourceClaim['studyStats'];
 readonly studyIdentity:CuratedSourceClaim['studyIdentity'];
 readonly locator:string;
 readonly rationale:string;
 readonly reviewCount:number;
 readonly reviewSeals:readonly string[];
 readonly reviewedAt:string|null;
 readonly audit:CuratedSourceClaim['audit'];
}
export interface EvidenceInvestigation {
 readonly taskId:string;
 readonly variantId:string;
 readonly observations:readonly InvestigationObservation[];
 readonly approved:number;
 readonly pending:number;
 readonly explicitUncertainty:string;
 readonly nextAction:string;
 readonly canAdjudicateHere:false;
}
export function assembleEvidenceInvestigation(
 task:EvidenceTriageTask,variantId:string,
 claims:readonly CuratedSourceClaim[],sources:readonly PassportSource[]
):EvidenceInvestigation{
 if(!/^[1-9][0-9]{0,17}$/.test(variantId)||
  !task.id||claims.some(c=>c.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(sources.map(s=>s.id)).size!==sources.length)
  throw new Error('Incompatible evidence investigation snapshot');
 const sourceMap=new Map(sources.map(s=>[s.id,s]));
 if(claims.some(c=>!sourceMap.has(c.referenceId)))throw new Error('Unlinked source claim');
 const ids=new Set(task.claimIds);
 if(ids.size!==task.claimIds.length||
  task.claimIds.some(id=>!claims.some(c=>c.id===id)))
  throw new Error('Stale investigation evidence links');
 const relevant=claims.filter(c=>
  ids.has(c.id)||
  (task.therapy!==null&&c.therapy===task.therapy)||
  (task.referenceId!==null&&c.referenceId===task.referenceId)
 );
 const observations=relevant.map(c=>{
  const source=sourceMap.get(c.referenceId)!;
  return Object.freeze({
   id:c.id,referenceId:c.referenceId,
   sourceTitle:source.title,citationUrl:source.url,
   status:c.status,therapy:c.therapy,finding:c.finding,
   scope:c.scope,genotypePair:c.genotypePair,model:c.method,
   studyFamilyId:c.studyFamilyId,endpoint:c.endpoint,
   studyStats:c.studyStats,studyIdentity:c.studyIdentity,
   locator:c.locator,rationale:c.rationale,reviewCount:c.reviewCount,
   reviewSeals:c.reviewSeals,reviewedAt:c.reviewedAt,audit:c.audit
  });
 });
 return Object.freeze({
  taskId:task.id,variantId,observations:Object.freeze(observations),
  approved:observations.filter(c=>c.status==='approved').length,
  pending:observations.filter(c=>c.status==='pending').length,
  explicitUncertainty:observations.length?
   'Observations may use different genotype contexts, endpoints, models or populations. Approval verifies the recorded claim review, not clinical efficacy or individual eligibility.':
   'No linked source observation is available in this authenticated snapshot. Do not infer biological non-response.',
  nextAction:task.nextAction,canAdjudicateHere:false as const
 });
}
