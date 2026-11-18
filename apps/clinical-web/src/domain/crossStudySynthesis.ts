import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CoreModulatorId} from './therapyRegistry';
import {resolveStudyIdentityLinks} from './reportedStudyIdentity';
import {endpointComparisonKey,endpointReadiness} from './researchEndpointNormalization';

/** 14H192–193: source-reconciled study-family inventory and review questions.
 * A 'conflict' is disagreement among reported records, not a drug-response
 * prediction. Related publications cannot masquerade as independent replication.
 */
export type SynthesisIssueKind='within-study-opposition'|'cross-study-opposition'|
 'population-or-assay-mismatch'|'genotype-scope-mismatch'|'study-identity-conflict'|
 'endpoint-not-comparable'|'insufficient-extraction';
export interface SynthesisIssue{
 readonly kind:SynthesisIssueKind;
 readonly claimIds:readonly string[];
 readonly referenceIds:readonly number[];
 readonly question:string;
 readonly disposition:'requires-independent-scientific-reconciliation';
}
export interface SynthesisStudy{
 readonly key:string;
 readonly claimIds:readonly string[];
 readonly sourceReferenceIds:readonly number[];
 readonly findings:readonly CuratedSourceClaim['finding'][];
 readonly studyMethods:readonly CuratedSourceClaim['method'][];
 readonly populationModels:readonly string[];
 readonly scopeKeys:readonly string[];
 readonly endpointsExtracted:number;
 readonly studyIdentityConflict:boolean;
}
export interface CrossStudySynthesis{
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly approvedSourceClaims:number;
 readonly studies:readonly SynthesisStudy[];
 readonly issues:readonly SynthesisIssue[];
 readonly explicitLimitations:readonly string[];
 readonly decisionSupport:false;
 readonly replicationProven:false;
 readonly effectEstimate:null;
 readonly conclusion:'no-automatic-directional-conclusion';
}
const id=/^[1-9][0-9]{0,17}$/;
const therapies=new Set<string>(['ETI','ALYFTREK','IVACAFTOR','LUMACAFTOR_IVACAFTOR','TEZACAFTOR_IVACAFTOR']);
const scopeKey=(c:CuratedSourceClaim):string=>c.scope==='single-variant'?'single-variant':
 'genotype:'+([...c.genotypePair!].sort().join('+'));
function issue(kind:SynthesisIssueKind,rows:readonly CuratedSourceClaim[],question:string):SynthesisIssue{
 return Object.freeze({
  kind,claimIds:Object.freeze([...new Set(rows.map(r=>r.id))].sort()),
  referenceIds:Object.freeze([...new Set(rows.map(r=>r.referenceId))].sort((a,b)=>a-b)),
  question,disposition:'requires-independent-scientific-reconciliation' as const
 });
}
export function synthesizeReviewedStudies(input:{
 variantId:string;therapy:CoreModulatorId;
 claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];
}):CrossStudySynthesis{
 const {variantId,therapy,claims,references}=input;
 if(!id.test(variantId)||!therapies.has(therapy)||claims.length>200||references.length>200||
  claims.some(c=>c.variantId!==variantId)||references.some(r=>r.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Incomplete exact-variant evidence inventory');
 const approved=claims.filter(c=>c.status==='approved');
 if(new Set(approved.map(c=>c.seriesId)).size!==approved.length||
  approved.some(c=>c.reviewCount!==2||c.reviewSeals.length!==2||
   c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt||
   !references.some(r=>r.id===c.referenceId)))
  throw new Error('Source-specific independent approval and original bibliography required');
 const rows=approved.filter(c=>c.therapy===therapy);
 const links=resolveStudyIdentityLinks(approved.map(c=>({
  claimId:c.id,studyFamilyId:c.studyFamilyId,studyIdentity:c.studyIdentity
 })));
 const groups=new Map<string,CuratedSourceClaim[]>();
 for(const row of rows){
  const key=links.get(row.id)?.key;
  if(!key)throw new Error('Unable to reconcile original study identity');
  groups.set(key,[...(groups.get(key)??[]),row]);
 }
 const studies:SynthesisStudy[]=[];
 const issues:SynthesisIssue[]=[];
 for(const [key,family] of [...groups.entries()].sort(([a],[b])=>a.localeCompare(b))){
  const scopes=[...new Set(family.map(scopeKey))].sort();
  const models=[...new Set(family.map(c=>c.studyIdentity?.populationModel??'not-reported'))].sort();
  const findings=[...new Set(family.map(c=>c.finding))].sort();
  const identityConflict=family.some(c=>links.get(c.id)?.identityConflict);
  if(identityConflict)issues.push(issue('study-identity-conflict',family,
   'Which registration and publication identity describes the original study and its cohort?'));
  if(findings.includes('reported-response')&&findings.includes('reported-no-response'))
   issues.push(issue('within-study-opposition',family,
    'Do contradictory observations represent different endpoints, genotypes, subgroups or reporting errors?'));
  if(scopes.length>1)issues.push(issue('genotype-scope-mismatch',family,
   'Are findings from different tested genotype scopes being conflated within one study family?'));
  studies.push(Object.freeze({
   key,claimIds:Object.freeze(family.map(c=>c.id).sort()),
   sourceReferenceIds:Object.freeze([...new Set(family.map(c=>c.referenceId))].sort((a,b)=>a-b)),
   findings:Object.freeze(findings),studyMethods:Object.freeze([...new Set(family.map(c=>c.method))].sort()),
   populationModels:Object.freeze(models),scopeKeys:Object.freeze(scopes),
   endpointsExtracted:family.filter(c=>endpointReadiness(c.endpoint)!=='unextracted').length,
   studyIdentityConflict:identityConflict
  }));
 }
 // Cross-study conflicts: a direction is comparable only after scope and
 // experimental context are checked. Never collapse unlike models into a verdict.
 const entries=[...groups.values()];
 const seen=new Set<string>();
 for(let i=0;i<entries.length;i++)for(let j=i+1;j<entries.length;j++){
  const a=entries[i]!,b=entries[j]!;
  const posA=a.some(c=>c.finding==='reported-response');
  const negA=a.some(c=>c.finding==='reported-no-response');
  const posB=b.some(c=>c.finding==='reported-response');
  const negB=b.some(c=>c.finding==='reported-no-response');
  if(!((posA&&negB)||(negA&&posB)))continue;
  const paired=[...a,...b];
  const scopes=new Set(paired.map(scopeKey));
  const models=new Set(paired.map(c=>c.studyIdentity?.populationModel??'not-reported'));
  const methods=new Set(paired.map(c=>c.method));
  const kind:SynthesisIssueKind=scopes.size>1?'genotype-scope-mismatch':
   models.size>1||methods.size>1?'population-or-assay-mismatch':'cross-study-opposition';
  const key=kind+':'+paired.map(c=>c.id).sort().join(':');
  if(seen.has(key))continue;seen.add(key);
  issues.push(issue(kind,paired,kind==='cross-study-opposition'?
   'Why do reviewed studies with matching reported scope and model describe opposing response directions?':
   kind==='genotype-scope-mismatch'?
   'Is the apparent disagreement caused by non-equivalent tested genotypes?':
   'Can findings from different methods or populations be compared without extrapolation?'));
 }
 const numeric=rows.filter(c=>endpointReadiness(c.endpoint)==='numeric');
 const endpointKeys=numeric.map(c=>endpointComparisonKey(c.endpoint,c.scope,
  c.genotypePair??undefined,c.method));
 if(numeric.length>1&&new Set(endpointKeys).size>1)
  issues.push(issue('endpoint-not-comparable',numeric,
   'Do different endpoints, units, assay models, comparators or timepoints prohibit numerical synthesis?'));
 const unextracted=rows.filter(c=>endpointReadiness(c.endpoint)==='unextracted'||
  !c.studyIdentity||c.studyIdentity.populationModel==='not-reported');
 if(unextracted.length)issues.push(issue('insufficient-extraction',unextracted,
  'Which original methods, population contexts or outcome definitions must be extracted before comparison?'));
 return Object.freeze({
  variantId,therapy,approvedSourceClaims:rows.length,
  studies:Object.freeze(studies),issues:Object.freeze(issues),
  explicitLimitations:Object.freeze([
   'This is a source-register synthesis, not a systematic literature review or meta-analysis.',
   'Study-family linkage is conservative and does not prove independent cohorts or replication.',
   'Source-reported response categories are not interchangeable with clinical treatment eligibility.'
  ]),
  decisionSupport:false as const,replicationProven:false as const,
  effectEstimate:null,conclusion:'no-automatic-directional-conclusion' as const
 });
}
