import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CoreModulatorId} from './therapyRegistry';
import {endpointComparisonKey,endpointDisplayValue,validResearchEndpoint} from './researchEndpointNormalization';
import {reportedRegistryKey,resolveStudyIdentityLinks} from './reportedStudyIdentity';

/** 14H199: direct, exact-variant source comparison. This is a research
 * triage docket, not a statistical meta-analysis or clinical reconciliation.
 * Only genuine, independently approved source claims participate.
 */
export type ReconciliationReason=
 'study-family-overlap'|'study-registration-overlap'|'reported-findings-differ';
export type ReconciliationContext=
 'exact-reported-endpoint-context'|'reported-context-differs'|'context-not-established';
export interface ReconciliationSource {
 readonly claimId:string;
 readonly seriesId:string;
 readonly revision:number;
 readonly therapy:CoreModulatorId;
 readonly studyFamilyId:string;
 readonly sourceTitle:string;
 readonly sourceUrl:string;
 readonly originalLocator:string;
 readonly finding:string;
 readonly method:string;
 readonly scope:string;
 readonly genotypePair:readonly string[]|null;
 readonly endpoint:string;
 readonly endpointContextKey:string|null;
 readonly model:string;
 readonly timepoint:string;
 readonly sampling:string;
 readonly studyRegistration:string|null;
 readonly interpretation:string;
 readonly reviewSeals:readonly string[];
}
export interface ReconciliationCase{
 readonly id:string;
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly first:ReconciliationSource;
 readonly second:ReconciliationSource;
 readonly reasons:readonly ReconciliationReason[];
 readonly context:ReconciliationContext;
 readonly contextQuestions:readonly string[];
 readonly resultIsAdjudicated:false;
}
export interface ReconciliationDocket{
 readonly variantId:string;
 readonly cases:readonly ReconciliationCase[];
 readonly totalCandidates:number;
 readonly limited:boolean;
 readonly excludedSourceClaims:number;
 readonly interpretation:'unresolved-research-comparisons-not-clinical-response';
}
const variantIdRegex=/^[1-9][0-9]{0,17}$/;
const approved=(c:CuratedSourceClaim)=>c.status==='approved'&&
 c.reviewCount===2&&c.reviewSeals.length===2&&
 c.reviewSeals[0]!==c.reviewSeals[1]&&!!c.reviewedAt;
function endpointKey(c:CuratedSourceClaim):string|null{
 return endpointComparisonKey(c.endpoint,c.scope,c.genotypePair??undefined,c.method);
}
function describeEndpoint(c:CuratedSourceClaim):string{
 const e=c.endpoint;
 if(!e||e.code==='not-reported')return 'Endpoint not extracted';
 if(!validResearchEndpoint(e))throw new Error('Invalid experimental endpoint provenance');
 return e.value===null?e.code+' · qualitative / no numeric value':e.code+' · '+endpointDisplayValue(e);
}
function sourceSnapshot(c:CuratedSourceClaim,reference:LiveEvidenceReference):ReconciliationSource{
 const endpoint=c.endpoint;
 const stats=c.studyStats;
 const identity=c.studyIdentity;
 return Object.freeze({
  claimId:c.id,seriesId:c.seriesId,revision:c.revision,therapy:c.therapy,
  studyFamilyId:c.studyFamilyId,sourceTitle:reference.title,sourceUrl:reference.url,
  originalLocator:c.locator,finding:c.finding,method:c.method,scope:c.scope,
  genotypePair:c.genotypePair?Object.freeze([...c.genotypePair]):null,
  endpoint:describeEndpoint(c),endpointContextKey:endpointKey(c),
  model:endpoint?.model??'not-reported',timepoint:endpoint?.timepoint??'not-reported',
  sampling:stats?.analysisUnit??'not-reported',
  studyRegistration:reportedRegistryKey(identity),
  interpretation:c.rationale,reviewSeals:Object.freeze([...c.reviewSeals])
 });
}
export function buildSourceReconciliationDocket(input:{
 variantId:string;claims:readonly CuratedSourceClaim[];
 references:readonly LiveEvidenceReference[];maxCases?:number
}):ReconciliationDocket{
 const {variantId,claims,references}=input;
 const maxCases=input.maxCases??100;
 if(!variantIdRegex.test(variantId)||claims.length>200||references.length>200||
  !Number.isSafeInteger(maxCases)||maxCases<1||maxCases>200||
  claims.some(c=>c.variantId!==variantId)||
  references.some(r=>r.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('A single verified exact-variant source inventory is required');
 const refMap=new Map(references.map(r=>[r.id,r]));
 const verified=claims.filter(c=>approved(c)&&refMap.has(c.referenceId));
 // Any unapproved or orphaned source claim is excluded, not silently trusted.
 const excludedSourceClaims=claims.length-verified.length;
 const studyLinks=resolveStudyIdentityLinks(verified.map(c=>({
  claimId:c.id,studyFamilyId:c.studyFamilyId,studyIdentity:c.studyIdentity
 })));
 const all:ReconciliationCase[]=[];
 for(let i=0;i<verified.length;i++){
  const a=verified[i]!,linkA=studyLinks.get(a.id);
  for(let j=i+1;j<verified.length;j++){
   const b=verified[j]!;
   if(a.therapy!==b.therapy)continue;
   // A corrected revision of a single claim series is not an independent observation.
   if(a.seriesId===b.seriesId)continue;
   const linkB=studyLinks.get(b.id);
   const reasons:ReconciliationReason[]=[];
   if(a.studyFamilyId.trim().toLowerCase()===b.studyFamilyId.trim().toLowerCase())
    reasons.push('study-family-overlap');
   const regA=reportedRegistryKey(a.studyIdentity),regB=reportedRegistryKey(b.studyIdentity);
   if(regA!==null&&regA===regB)reasons.push('study-registration-overlap');
   if(a.finding!==b.finding)reasons.push('reported-findings-differ');
   if(!reasons.length)continue;
   const keyA=endpointKey(a),keyB=endpointKey(b);
   const context:ReconciliationContext=keyA!==null&&keyA===keyB?
    'exact-reported-endpoint-context':
    keyA!==null&&keyB!==null?'reported-context-differs':'context-not-established';
   const questions:string[]=[];
   if(linkA&&linkB&&linkA.key===linkB.key)
    questions.push('Claims may describe overlapping experiments or publications; confirm underlying study independence');
   if(linkA?.identityConflict||linkB?.identityConflict)
    questions.push('Conflicting study registrations are linked; verify original registry documentation');
   if(a.scope!==b.scope||JSON.stringify(a.genotypePair)!==JSON.stringify(b.genotypePair))
    questions.push('Genotype and variant scope differ; do not assume identical therapeutic populations');
   if(a.method!==b.method)
    questions.push('Methods differ; clinical and laboratory findings are not interchangeable');
   if(a.finding!==b.finding)
    questions.push('Recorded finding labels differ; inspect exact endpoints and author interpretation before claiming disagreement');
   if(context!=='exact-reported-endpoint-context')
    questions.push('Matched experimental endpoint context is not established; numeric pooling and direct effect comparison are not supported');
   if(a.studyStats?.analysisUnit!==b.studyStats?.analysisUnit)
    questions.push('Reported analysis units differ or were not extracted; do not equate patients, donors and replicates');
   if(!questions.length)
    questions.push('Verify publication overlap and contextual interpretation before reusing claims as independent evidence');
   const snapshots=[a,b].sort((x,y)=>x.id.localeCompare(y.id));
   const first=snapshots[0]!,second=snapshots[1]!;
   all.push(Object.freeze({
    id:first.id+':'+second.id,variantId,therapy:a.therapy,
    first:sourceSnapshot(first,refMap.get(first.referenceId)!),
    second:sourceSnapshot(second,refMap.get(second.referenceId)!),
    reasons:Object.freeze(reasons),
    context,contextQuestions:Object.freeze(questions),
    resultIsAdjudicated:false as const
   }));
  }
 }
 const priority=(c:ReconciliationCase):number=>
  (c.reasons.includes('reported-findings-differ')?0:1)+
  (c.context==='exact-reported-endpoint-context'?0:2);
 all.sort((a,b)=>priority(a)-priority(b)||a.therapy.localeCompare(b.therapy)||a.id.localeCompare(b.id));
 return Object.freeze({
  variantId,cases:Object.freeze(all.slice(0,maxCases)),
  totalCandidates:all.length,limited:all.length>maxCases,
  excludedSourceClaims,
  interpretation:'unresolved-research-comparisons-not-clinical-response' as const
 });
}

export type ReconciliationQuestionKind=
 'study-overlap'|'endpoint-or-assay'|'genotype-or-population'|
 'source-interpretation'|'needs-additional-evidence';
export interface ReconciliationResearchNote {
 readonly format:'neumuacfq-reconciliation-research-note-v1';
 readonly status:'unreviewed-local-working-note';
 readonly createdAt:string;
 readonly variantId:string;
 readonly caseId:string;
 readonly questionKind:ReconciliationQuestionKind;
 readonly question:string;
 readonly sourceContext:string;
 readonly followUp:string;
 readonly sourceClaims:readonly [ReconciliationSource,ReconciliationSource];
 readonly questionsForScientificReview:readonly string[];
 readonly clinicalConclusionProvided:false;
}
const safe=(v:unknown,min:number,max:number):v is string=>
 typeof v==='string'&&v.length>=min&&v.length<=max&&v.trim()===v&&
 !/[\u0000-\u001f\u007f]/.test(v);
export function createReconciliationResearchNote(
 row:ReconciliationCase,input:{
 questionKind:ReconciliationQuestionKind;question:string;
 sourceContext:string;followUp:string;createdAt:string
}):ReconciliationResearchNote{
 if(row.resultIsAdjudicated!==false||!variantIdRegex.test(row.variantId)||
  !['study-overlap','endpoint-or-assay','genotype-or-population',
   'source-interpretation','needs-additional-evidence'].includes(input.questionKind)||
  !safe(input.question,30,1000)||!safe(input.sourceContext,30,1200)||
  !safe(input.followUp,20,800)||!safe(input.createdAt,10,64)||
  !Number.isFinite(Date.parse(input.createdAt)))
  throw new Error('Complete source-specific reconciliation notes required');
 return Object.freeze({
  format:'neumuacfq-reconciliation-research-note-v1' as const,
  status:'unreviewed-local-working-note' as const,
  createdAt:input.createdAt,variantId:row.variantId,caseId:row.id,
  questionKind:input.questionKind,question:input.question,
  sourceContext:input.sourceContext,followUp:input.followUp,
  sourceClaims:Object.freeze([row.first,row.second]) as readonly [ReconciliationSource,ReconciliationSource],
  questionsForScientificReview:Object.freeze([...row.contextQuestions]),
  clinicalConclusionProvided:false as const
 });
}
export function portableReconciliationResearchNotes(notes:readonly ReconciliationResearchNote[]):string{
 if(notes.length>100||
  notes.some(n=>n.status!=='unreviewed-local-working-note'||n.clinicalConclusionProvided!==false)||
  new Set(notes.map(n=>n.variantId)).size>1)
  throw new Error('Invalid scientific reconciliation notebook');
 return JSON.stringify(Object.freeze({
  format:'neumuacfq-unreviewed-reconciliation-notebook-v1',
  decisionUse:'research-only-not-clinical',
  notes,
  warning:'Unreviewed working notes. This is not source adjudication, independent review, mechanistic proof or a therapy recommendation.'
 }),null,2);
}
