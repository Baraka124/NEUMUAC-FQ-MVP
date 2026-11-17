import {describe,it,expect} from 'vitest';
import {decodeApprovedDataset} from '../services/approvedResearchDataset';
import {
 ANALYSIS_PROTOCOL_ID,studyFamilyPartition,buildStudyFamilyAnalysisProtocol,
 analysisProtocolJson
} from './studyFamilyAnalysisProtocol';

const sourceBase={
 revision:1,variantId:'18',referenceId:71,
 referenceTitle:'Reviewed scientific publication',
 referenceUrl:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 referencePmid:'12345678',referenceDoi:null,
 therapy:'ETI',scope:'single-variant',genotypePair:null,
 method:'clinical-study',finding:'reported-response',
 locator:'Reported change in Table 2',
 endpoint:{code:'sweat-chloride',statistic:'change-from-baseline',
  unit:'mmol/L',value:-22.4,model:'clinical',
  comparator:'baseline',timepoint:'Day 28'},
 reviewCount:2,reviewedAt:'2026-11-16T08:00:00Z'
};
function source(n:number,family:string,extra:Record<string,unknown>={}){
 return {...sourceBase,
  claimId:n.toString(16).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seriesId:n.toString(16).padStart(8,'0')+'-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  studyFamilyId:family,...extra
 };
}
function snapshot(records:readonly ReturnType<typeof source>[]){
 const sorted=[...records].sort((a,b)=>{
  const v=BigInt(String(a.variantId))-BigInt(String(b.variantId));
  return v<0n?-1:v>0n?1:String(a.therapy).localeCompare(String(b.therapy))||
   String(a.studyFamilyId).localeCompare(String(b.studyFamilyId))||
   a.claimId.localeCompare(b.claimId);
 });
 return decodeApprovedDataset({
  source:'nfq-approved-research-dataset-v1',schemaVersion:1,
  snapshotSha256:'a'.repeat(64),generatedAt:'2026-11-17T08:00:00Z',
  total:sorted.length,records:sorted,
  limitations:[
   'Research-only source-level metadata',
   'No patient genotypes, individual outcomes or source sample size verified',
   'No automatic effect estimation, cross-study pooling or response prediction'
  ]
 });
}
const all={therapy:'all',endpoint:'all'} as const;
describe('14H170 source-family-safe pre-analysis protocol',()=>{
 it('correctly blocks empty reviewed source snapshots; never fabricates an eligible cohort',()=>{
  const plan=buildStudyFamilyAnalysisProtocol(snapshot([]),all);
  expect(plan.protocol).toBe(ANALYSIS_PROTOCOL_ID);
  expect(plan.gate).toBe('no-approved-source-data');
  expect(plan.cohorts).toHaveLength(0);
  expect(plan.reviewedRowsInScope).toBe(0);
  expect(plan.internalSplitCandidateCohorts).toBe(0);
  expect(plan.sourceSnapshotSha256).toBe('a'.repeat(64));
  expect(JSON.parse(analysisProtocolJson(plan)).cohorts).toEqual([]);
 });
 it('excludes missing, nonstandard and biologically mismatched outcomes explicitly',()=>{
  const s=snapshot([
   source(1,'family-01',{endpoint:null}),
   source(2,'family-02',{endpoint:{...sourceBase.endpoint,value:null,
    statistic:'not-reported',unit:'not-reported',timepoint:'not-reported'}}),
   source(3,'family-03',{endpoint:{code:'organoid-fis',statistic:'absolute',
    unit:'study-specific',value:1.8,model:'intestinal-organoid',
    comparator:'vehicle',timepoint:'48 h'},method:'in-vitro-study'}),
   source(4,'family-04',{endpoint:{...sourceBase.endpoint,model:'cell-line'}})
  ]);
  const plan=buildStudyFamilyAnalysisProtocol(s,all);
  expect(plan.reviewedRowsInScope).toBe(4);
  expect(plan.eligibleNumericObservations).toBe(0);
  expect(plan.excludedObservations).toBe(4);
  expect(plan.gate).toBe('no-eligible-numeric-outcomes');
  expect(plan.excluded.map(x=>x.reason)).toEqual([
   'missing-numeric-outcome','missing-numeric-outcome',
   'context-not-comparable','method-model-disagreement'
  ]);
 });
 it('never pools two therapies, variants, timepoints or experiment methods',()=>{
  const s=snapshot([
   source(1,'family-a'),
   source(2,'family-b',{therapy:'ALYFTREK'}),
   source(3,'family-c',{variantId:'19'}),
   source(4,'family-d',{endpoint:{...sourceBase.endpoint,timepoint:'Day 56'}}),
   source(5,'family-e',{method:'in-vitro-study',
    endpoint:{code:'cftr-current',statistic:'absolute',
     unit:'uA/cm2',value:18,model:'cell-line',
     comparator:'vehicle',timepoint:'Day 28'}})
  ]);
  const plan=buildStudyFamilyAnalysisProtocol(s,all);
  expect(plan.eligibleNumericObservations).toBe(5);
  expect(plan.cohorts).toHaveLength(5);
  expect(plan.cohorts.every(x=>x.labelledStudyFamilies===1)).toBe(true);
  expect(plan.gate).toBe('descriptive-research-only');
 });
 it('keeps all records from one normalized study-family label in the same provisional partition across variants and therapies',()=>{
  const s=snapshot([
   source(1,'PMID-12345678'),
   source(2,'pmid-12345678',{variantId:'19'}),
   source(3,' PMID-12345678 ',{therapy:'ALYFTREK'})
  ]);
  const plan=buildStudyFamilyAnalysisProtocol(s,all);
  const allocation=plan.cohorts.flatMap(c=>c.observations.map(x=>x.partition));
  expect(new Set(allocation).size).toBe(1);
  expect(allocation[0]).toBe(studyFamilyPartition('PMID-12345678'));
 });
 it('marks a split as a plan only when a cohort has multiple real labelled families on each side',()=>{
  const familyNames=Array.from({length:40},(_,i)=>'study-'+String(i+1).padStart(3,'0'));
  const chosen=[
   ...familyNames.filter(n=>studyFamilyPartition(n)==='development').slice(0,6),
   ...familyNames.filter(n=>studyFamilyPartition(n)==='internal-holdout').slice(0,3)
  ];
  expect(chosen).toHaveLength(9);
  const plan=buildStudyFamilyAnalysisProtocol(
   snapshot(chosen.map((name,i)=>source(i+1,name))),all
  );
  expect(plan.cohorts).toHaveLength(1);
  expect(plan.cohorts[0].labelledStudyFamilies).toBe(9);
  expect(plan.cohorts[0].developmentFamilies).toBe(6);
  expect(plan.cohorts[0].internalHoldoutFamilies).toBe(3);
  expect(plan.internalSplitCandidateCohorts).toBe(1);
  expect(plan.gate).toBe('internal-split-plan-only');
  const exported=JSON.parse(analysisProtocolJson(plan));
  expect(exported.caveats.join(' ')).toContain('not independent external clinical validation');
  expect(JSON.stringify(exported)).not.toContain('accuracy');
  expect(JSON.stringify(exported)).not.toContain('predicted_response');
 });
 it('does not treat repeated observations from one family as independent replication',()=>{
  const plan=buildStudyFamilyAnalysisProtocol(snapshot([
   source(1,'family-01'),
   source(2,'family-01',{referenceId:72,endpoint:{...sourceBase.endpoint,value:-18.1}})
  ]),all);
  expect(plan.cohorts[0].observationCount).toBe(2);
  expect(plan.cohorts[0].labelledStudyFamilies).toBe(1);
  expect(plan.labelledStudyFamilies).toBe(1);
  expect(plan.internalSplitCandidateCohorts).toBe(0);
 });
 it('filters actual therapies and endpoints without changing the original snapshot',()=>{
  const s=snapshot([
   source(1,'family-a'),
   source(2,'family-b',{therapy:'ALYFTREK'})
  ]);
  const a=buildStudyFamilyAnalysisProtocol(s,{therapy:'ETI',endpoint:'sweat-chloride'});
  const b=buildStudyFamilyAnalysisProtocol(s,{therapy:'ETI',endpoint:'ppfev1'});
  expect(a.reviewedRowsInScope).toBe(1);
  expect(b.reviewedRowsInScope).toBe(0);
  expect(b.gate).toBe('no-selected-records');
  expect(s.total).toBe(2);
  expect(()=>buildStudyFamilyAnalysisProtocol(s,{therapy:'NONEXISTENT' as 'ETI',endpoint:'all'})).toThrow();
 });
});
