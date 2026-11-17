import {describe,it,expect} from 'vitest';
import {decodeApprovedDataset} from '../services/approvedResearchDataset';
import {buildStudyFamilyAnalysisProtocol,studyFamilyPartition} from './studyFamilyAnalysisProtocol';
import {
 evaluateStudyAdjudications,pairKey,type StudyAdjudication
} from './studyAdjudication';

const linkedIdentity={
 registryType:'nct',registryId:'NCT12345678',
 publicationRole:'primary-report',populationModel:'clinical-participants',
 diseaseGroup:'cystic-fibrosis',ageGroup:'adult',
 cohortLabel:null,populationDescription:null,sourceLocator:'Methods · Study registration'
};
function row(n:number,family:string,extra:Record<string,unknown>={}){
 return {
  claimId:n.toString(16).padStart(8,'0')+'-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  seriesId:n.toString(16).padStart(8,'0')+'-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  revision:1,variantId:'18',referenceId:100+n,
  referenceTitle:'Clinical source publication '+n,
  referenceUrl:'https://pubmed.ncbi.nlm.nih.gov/'+String(9000000+n)+'/',
  referencePmid:String(9000000+n),referenceDoi:null,
  therapy:'ETI',scope:'single-variant',genotypePair:null,
  method:'clinical-study',finding:'reported-response',studyFamilyId:family,
  locator:'Results · Table 2',
  endpoint:{code:'sweat-chloride',statistic:'change-from-baseline',
   value:-20,unit:'mmol/L',model:'clinical',comparator:'baseline',timepoint:'Day 28'},
  studyStats:null,studyIdentity:null,
  reviewCount:2,reviewedAt:'2026-11-17T09:00:00Z',...extra
 };
}
function source(rows:ReturnType<typeof row>[]){
 const sorted=[...rows].sort((a,b)=>{
  const v=BigInt(String(a.variantId))-BigInt(String(b.variantId));
  return v<0n?-1:v>0n?1:String(a.therapy).localeCompare(String(b.therapy))||
   String(a.studyFamilyId).localeCompare(String(b.studyFamilyId))||
   a.claimId.localeCompare(b.claimId);
 });
 return decodeApprovedDataset({
  source:'nfq-approved-research-dataset-v1',schemaVersion:1,
  snapshotSha256:'a'.repeat(64),generatedAt:'2026-11-17T09:05:00Z',
  total:sorted.length,records:sorted,limitations:[
   'Research-only source-level metadata',
   'No patient genotypes, individual outcomes or source sample size verified',
   'No automatic effect estimation, cross-study pooling or response prediction'
  ]
 });
}
function decision(a:string,b:string,status:StudyAdjudication['status'],
 disposition:StudyAdjudication['disposition']='same-study'):StudyAdjudication{
 const pair=[a,b].sort();
 return {
  id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',claimA:pair[0],claimB:pair[1],
  revision:1,disposition,rationale:'The source trial registration and population match.',
  evidenceLocator:'Original Methods · registry identifier',status,
  submittedAt:'2026-11-17T09:10:00Z',
  decidedAt:status==='approved'?'2026-11-17T10:00:00Z':null,
  reviewCount:status==='approved'?2:1,submittedByMe:false,canReview:false
 };
}
describe('14H173 source-pair adjudication readiness',()=>{
 it('begins empty and never creates synthetic decisions or study candidates',()=>{
  const s=source([]);
  const result=evaluateStudyAdjudications(s,[]);
  expect(result.candidateCount).toBe(0);
  expect(result.unresolvedCount).toBe(0);
  expect(buildStudyFamilyAnalysisProtocol(s,{therapy:'all',endpoint:'all'},[]).gate)
   .toBe('no-approved-source-data');
 });
 it('detects two publications of one study as unresolved until two independent reviews have approved the link',()=>{
  const a=row(1,'PMID-9000001',{studyIdentity:linkedIdentity});
  const b=row(2,'PMID-9000002',{studyIdentity:{
   ...linkedIdentity,publicationRole:'secondary-analysis'
  }});
  const s=source([a,b]);
  const initial=evaluateStudyAdjudications(s,[]);
  expect(initial.candidateCount).toBe(1);
  expect(initial.unresolvedCount).toBe(1);
  expect(initial.candidates[0].status).toBe('not-proposed');
  const pending=evaluateStudyAdjudications(s,[decision(a.claimId,b.claimId,'pending')]);
  expect(pending.pendingCount).toBe(1);
  expect(pending.unresolvedCount).toBe(1);
  const accepted=evaluateStudyAdjudications(s,[decision(a.claimId,b.claimId,'approved')]);
  expect(accepted.approvedSameStudy).toBe(1);
  expect(accepted.unresolvedCount).toBe(0);
  expect(pairKey(a.claimId,b.claimId)).toBe(pairKey(b.claimId,a.claimId));
 });
 it('an approved distinct-studies judgement does not automatically split the pre-existing conservative source family',()=>{
  const a=row(1,'family-01');
  const b=row(2,'family-01');
  const s=source([a,b]);
  const d=decision(a.claimId,b.claimId,'approved','distinct-studies');
  const report=evaluateStudyAdjudications(s,[d]);
  expect(report.distinctNeedsReconciliation).toBe(1);
  expect(report.unresolvedCount).toBe(1);
  expect(buildStudyFamilyAnalysisProtocol(s,{therapy:'all',endpoint:'all'},[d])
   .cohorts[0].labelledStudyFamilies).toBe(1);
 });
 it('conflicting registry accessions remain blocked even if someone approved a same-study judgement',()=>{
  const a=row(1,'family-X',{studyIdentity:linkedIdentity});
  const b=row(2,'family-X',{studyIdentity:{...linkedIdentity,registryId:'NCT87654321'}});
  const s=source([a,b]);
  const report=evaluateStudyAdjudications(s,[decision(a.claimId,b.claimId,'approved')]);
  expect(report.sourceRegistrationConflicts).toBe(1);
  expect(report.unresolvedCount).toBe(1);
  expect(report.candidates[0].registeredConflict).toBe(true);
 });
 it('blocks a nominally large internal split until all linked publications are reviewed in the complete source context',()=>{
  const labels=Array.from({length:90},(_,i)=>'study-'+String(i+1).padStart(3,'0'));
  const selected=[
   ...labels.filter(x=>studyFamilyPartition(x)==='development').slice(0,6),
   ...labels.filter(x=>studyFamilyPartition(x)==='internal-holdout').slice(0,3)
  ];
  expect(selected).toHaveLength(9);
  const claims=selected.map((f,i)=>row(i+1,f));
  const copied=row(20,selected[0]);
  const s=source([...claims,copied]);
  const selector={therapy:'all',endpoint:'all'} as const;
  expect(buildStudyFamilyAnalysisProtocol(s,selector).gate).toBe('identity-review-unavailable');
  expect(buildStudyFamilyAnalysisProtocol(s,selector,[]).gate).toBe('identity-adjudication-required');
  const complete=buildStudyFamilyAnalysisProtocol(s,selector,[
   decision(claims[0].claimId,copied.claimId,'approved')
  ]);
  expect(complete.gate).toBe('internal-split-plan-only');
  expect(complete.internalSplitCandidateCohorts).toBe(1);
  expect(complete.acceptedSameStudyLinks).toBe(1);
 });
});
