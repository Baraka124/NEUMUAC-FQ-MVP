import type {CoreModulatorId} from './therapyRegistry';
import {
 endpointComparisonKey,type EndpointCode
} from './researchEndpointNormalization';
import {
 assessApprovedDataset,
 type ApprovedDatasetRow,type ApprovedDatasetSnapshot
} from '../services/approvedResearchDataset';

/** Phase 14H170: a preregistration-ready *planning* instrument.
 * The output is a source-linked cohort audit, not a trained model,
 * a clinical predictor, or evidence of statistical analysis readiness.
 */
export const ANALYSIS_PROTOCOL_ID='nfq-study-family-analysis-protocol-v1' as const;
export type StudyPartition='development'|'internal-holdout';
export type ProtocolSelection={
 readonly therapy:'all'|CoreModulatorId;
 readonly endpoint:'all'|EndpointCode;
};
export type ExclusionReason=
 'missing-numeric-outcome'|'context-not-comparable'|'method-model-disagreement';
export interface ProtocolExcludedRow{
 readonly claimId:string;
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly studyFamilyId:string;
 readonly reason:ExclusionReason;
}
export interface ProtocolObservation{
 readonly claimId:string;
 readonly referenceId:number;
 readonly studyFamilyId:string;
 readonly partition:StudyPartition;
 readonly reportedValue:number;
}
export interface AnalysisCohort{
 readonly key:string;
 readonly variantId:string;
 readonly therapy:CoreModulatorId;
 readonly scope:string;
 readonly method:string;
 readonly endpoint:Exclude<EndpointCode,'not-reported'>;
 readonly statistic:string;
 readonly unit:string;
 readonly model:string;
 readonly comparator:string;
 readonly timepoint:string;
 readonly observationCount:number;
 readonly labelledStudyFamilies:number;
 readonly developmentFamilies:number;
 readonly internalHoldoutFamilies:number;
 readonly internalSplitPossible:boolean;
 readonly observations:readonly ProtocolObservation[];
}
export interface StudyFamilyAnalysisProtocol{
 readonly protocol:typeof ANALYSIS_PROTOCOL_ID;
 readonly protocolVersion:1;
 readonly sourceSnapshotSha256:string;
 readonly sourceSchemaVersion:1;
 readonly selection:ProtocolSelection;
 readonly reviewedRowsInScope:number;
 readonly eligibleNumericObservations:number;
 readonly excludedObservations:number;
 readonly excluded:readonly ProtocolExcludedRow[];
 readonly labelledStudyFamilies:number;
 readonly cohorts:readonly AnalysisCohort[];
 readonly internalSplitCandidateCohorts:number;
 readonly gate:'no-approved-source-data'|'no-eligible-numeric-outcomes'|
  'descriptive-research-only'|'internal-split-plan-only';
 readonly caveats:readonly string[];
}
/** Normalizes a curator-provided study family label only for conservative
 * leakage prevention. Source family labels do not establish independent trials.
 */
function normalizeFamily(id:string):string{
 return id.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();
}
/** Stable, explicitly noncryptographic assignment for exploratory internal
 * split planning. No random resampling or statistical validation is claimed.
 */
export function studyFamilyPartition(studyFamilyId:string):StudyPartition{
 const normalized=normalizeFamily(studyFamilyId);
 if(!normalized)throw new Error('Missing source study-family label');
 let hash=2166136261;
 for(let i=0;i<normalized.length;i++){
  hash=Math.imul(hash^normalized.charCodeAt(i),16777619)>>>0;
 }
 return hash%5===0?'internal-holdout':'development';
}
function methodModelDisagreement(row:ApprovedDatasetRow):boolean{
 const endpoint=row.endpoint;
 if(!endpoint||endpoint.value===null)return false;
 return (
  row.method==='clinical-study'&&endpoint.model!=='clinical'||
  row.method==='in-vitro-study'&&endpoint.model==='clinical'||
  row.method==='curated-literature'&&endpoint.model==='clinical'
 );
}
function compareCohorts(a:AnalysisCohort,b:AnalysisCohort):number{
 const variant=BigInt(a.variantId)-BigInt(b.variantId);
 if(variant!==0n)return variant<0n?-1:1;
 return a.therapy.localeCompare(b.therapy)||a.key.localeCompare(b.key);
}
export function buildStudyFamilyAnalysisProtocol(
 snapshot:ApprovedDatasetSnapshot,selection:ProtocolSelection
):StudyFamilyAnalysisProtocol{
 if(!snapshot||snapshot.source!=='nfq-approved-research-dataset-v1'||snapshot.schemaVersion!==1||
  !/^[0-9a-f]{64}$/.test(snapshot.snapshotSha256)||
  selection.therapy!=='all'&&
   !['ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR',
     'LUMACAFTOR_IVACAFTOR'].includes(selection.therapy)||
  selection.endpoint!=='all'&&
   !['sweat-chloride','ppfev1','cftr-current','organoid-fis','other','not-reported']
    .includes(selection.endpoint))
  throw new Error('Invalid analysis protocol or evidence snapshot');
 const quality=assessApprovedDataset(snapshot);
 const selected=quality.rows.filter(({record:r})=>
  (selection.therapy==='all'||r.therapy===selection.therapy)&&
  (selection.endpoint==='all'||(r.endpoint?.code??'not-reported')===selection.endpoint)
 );
 const cohorts=new Map<string,{
  representative:ApprovedDatasetRow;contextKey:string;
  observations:ProtocolObservation[];
 }>();
 const excluded:ProtocolExcludedRow[]=[];
 const eligibleFamilyLabels=new Set<string>();
 for(const {record:r} of selected){
  const endpoint=r.endpoint;
  let reason:ExclusionReason|null=null;
  if(!endpoint||endpoint.value===null)reason='missing-numeric-outcome';
  else if(methodModelDisagreement(r))reason='method-model-disagreement';
  else if(endpointComparisonKey(endpoint,r.scope,r.genotypePair??undefined,r.method)===null)
   reason='context-not-comparable';
  if(reason){
   excluded.push(Object.freeze({
    claimId:r.claimId,variantId:r.variantId,therapy:r.therapy,
    studyFamilyId:r.studyFamilyId,reason
   }));
   continue;
  }
  // The explicit numeric check is a guard against future schema expansion.
  if(!endpoint||endpoint.value===null)throw new Error('No numeric source outcome');
  const context=endpointComparisonKey(
   endpoint,r.scope,r.genotypePair??undefined,r.method
  );
  if(!context)throw new Error('Missing exact experimental context');
  const key=r.variantId+'|'+r.therapy+'|'+context;
  const current=cohorts.get(key)??{representative:r,contextKey:context,observations:[]};
  current.observations.push(Object.freeze({
   claimId:r.claimId,referenceId:r.referenceId,
   studyFamilyId:r.studyFamilyId,
   partition:studyFamilyPartition(r.studyFamilyId),
   reportedValue:endpoint.value
  }));
  cohorts.set(key,current);
  eligibleFamilyLabels.add(normalizeFamily(r.studyFamilyId));
 }
 const planned=[...cohorts].map(([key,{representative:r,observations}])=>{
  const endpoint=r.endpoint!;
  const families=new Map<string,StudyPartition>();
  for(const item of observations){
   const label=normalizeFamily(item.studyFamilyId);
   if(families.has(label)&&families.get(label)!==item.partition)
    throw new Error('Study-family data split leakage');
   families.set(label,item.partition);
  }
  const development=[...families.values()].filter(x=>x==='development').length;
  const holdout=families.size-development;
  // An internal split can be *planned* only at an operational family-count
  // floor. This is not a statistical power calculation or scientific approval.
  const internalSplitPossible=development>=5&&holdout>=2&&families.size>=8;
  return Object.freeze({
   key,variantId:r.variantId,therapy:r.therapy,
   scope:r.scope,method:r.method,
   endpoint:endpoint.code as Exclude<EndpointCode,'not-reported'>,
   statistic:endpoint.statistic,unit:endpoint.unit,
   model:endpoint.model,comparator:endpoint.comparator,timepoint:endpoint.timepoint,
   observationCount:observations.length,labelledStudyFamilies:families.size,
   developmentFamilies:development,internalHoldoutFamilies:holdout,
   internalSplitPossible,observations:Object.freeze(observations)
  });
 }).sort(compareCohorts);
 const splitCandidate=planned.filter(x=>x.internalSplitPossible).length;
 const eligible=[...planned].reduce((n,c)=>n+c.observationCount,0);
 if(eligible+excluded.length!==selected.length)
  throw new Error('The research protocol has dropped source observations');
 const gate:StudyFamilyAnalysisProtocol['gate']=selected.length===0?
  'no-approved-source-data':eligible===0?'no-eligible-numeric-outcomes':
  splitCandidate>0?'internal-split-plan-only':'descriptive-research-only';
 return Object.freeze({
  protocol:ANALYSIS_PROTOCOL_ID,protocolVersion:1,
  sourceSnapshotSha256:snapshot.snapshotSha256,
  sourceSchemaVersion:snapshot.schemaVersion,
  selection:Object.freeze({...selection}),
  reviewedRowsInScope:selected.length,
  eligibleNumericObservations:eligible,
  excludedObservations:excluded.length,
  excluded:Object.freeze(excluded),
  labelledStudyFamilies:eligibleFamilyLabels.size,
  cohorts:Object.freeze(planned),
  internalSplitCandidateCohorts:splitCandidate,gate,
  caveats:Object.freeze([
   'Research-planning manifest only: no model fitting, inference or patient-level predictions',
   'Study-family labels are provisional; linked publications can represent one trial',
   'No source-reported sample sizes, standard errors or variance were established for effect estimation',
   'Internal source-family holdout is not independent external clinical validation',
   'Cohorts with differing assays, scope, comparators, method, unit or timepoint are never pooled',
   'All statistical design and proposed thresholds require scientific protocol approval'
  ])
 });
}
export function analysisProtocolJson(protocol:StudyFamilyAnalysisProtocol):string{
 if(protocol.protocol!==ANALYSIS_PROTOCOL_ID||
  protocol.eligibleNumericObservations+protocol.excludedObservations!==protocol.reviewedRowsInScope)
  throw new Error('Analysis manifest does not reconcile with source rows');
 return JSON.stringify(protocol,null,2);
}
