import {describe,expect,it} from 'vitest';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {
 buildSourceReconciliationDocket,createReconciliationResearchNote,
 portableReconciliationResearchNotes
} from './sourceEvidenceReconciliation';
import {UNEXTRACTED_ENDPOINT,type ResearchEndpoint} from './researchEndpointNormalization';
import {UNREPORTED_STUDY_IDENTITY,type ReportedStudyIdentity} from './reportedStudyIdentity';
import {UNREPORTED_STUDY_STATISTICS} from './reportedStudyStatistics';

const A='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const C='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ref=(id:number):LiveEvidenceReference=>({
 id,variantId:'18',title:'Original publication '+id,
 url:'https://pubmed.ncbi.nlm.nih.gov/'+id+'/'
} as LiveEvidenceReference);
const claim=(id:string,referenceId:number,more:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id,seriesId:id,revision:1,parentClaimId:null,variantId:'18',
 referenceId,therapy:'ETI',scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'reported-response',
 studyFamilyId:'study-alpha',locator:'Results Figure 2B',
 rationale:'Original publication reports a source-specific experimental observation.',
 endpoint:UNEXTRACTED_ENDPOINT,studyStats:UNREPORTED_STUDY_STATISTICS,
 studyIdentity:UNREPORTED_STUDY_IDENTITY,
 status:'approved',submittedAt:'2026-11-17T18:00:00Z',
 submittedByMe:false,reviewCount:2,reviewedAt:'2026-11-17T19:00:00Z',
 reviewSeals:['attestation:11111111-1111-4111-8111-111111111111',
  'attestation:22222222-2222-4222-8222-222222222222'],
 canReview:false,audit:[],...more
});
const endpoint=(value:number):ResearchEndpoint=>({
 code:'cftr-current',statistic:'absolute',unit:'uA/cm2',value,
 model:'airway-epithelium',comparator:'wild-type',timepoint:'24 h'
});
const registered=(registryId:string):ReportedStudyIdentity=>({
 ...UNREPORTED_STUDY_IDENTITY,
 registryType:'nct',registryId,
 publicationRole:'primary-report',populationModel:'clinical-participants',
 diseaseGroup:'cystic-fibrosis',ageGroup:'adult',
 sourceLocator:'Methods, clinical trial registration'
});
const docket=(claims:CuratedSourceClaim[],refs=[ref(71),ref(72)],maxCases?:number)=>
 buildSourceReconciliationDocket({
  variantId:'18',claims,references:refs,maxCases
 });
describe('14H199 reviewed-source comparisons',()=>{
 it('starts honestly empty when no reviewed source pairs exist',()=>{
  const output=docket([]);
  expect(output.cases).toHaveLength(0);
  expect(output.totalCandidates).toBe(0);
  expect(output.interpretation).toBe('unresolved-research-comparisons-not-clinical-response');
 });
 it('compares original papers without treating shared study family as independent replication',()=>{
  const output=docket([
   claim(A,71),claim(B,72,{finding:'reported-no-response'})
  ]);
  expect(output.cases).toHaveLength(1);
  const item=output.cases[0]!;
  expect(item.reasons).toContain('study-family-overlap');
  expect(item.reasons).toContain('reported-findings-differ');
  expect(item.context).toBe('context-not-established');
  expect(item.resultIsAdjudicated).toBe(false);
  expect(item.first.sourceUrl).toMatch(/^https:\/\/pubmed/);
  expect(item.second.sourceUrl).toMatch(/^https:\/\/pubmed/);
  expect(item.contextQuestions.some(x=>x.includes('independence'))).toBe(true);
 });
 it('identifies context-aligned measured endpoints but never converts them to pooled estimates',()=>{
  const output=docket([
   claim(A,71,{endpoint:endpoint(5)}),
   claim(B,72,{endpoint:endpoint(6),finding:'reported-no-response',
    studyFamilyId:'study-beta'})
  ]);
  const item=output.cases[0]!;
  expect(item.context).toBe('exact-reported-endpoint-context');
  expect(item.first.endpoint).toContain('5');
  expect(item.second.endpoint).toContain('6');
  expect(item).not.toHaveProperty('average');
  expect(item).not.toHaveProperty('predictedResponse');
  expect(item.resultIsAdjudicated).toBe(false);
 });
 it('refuses directly comparable endpoint context across distinct timepoints',()=>{
  const changed={...endpoint(6),timepoint:'Day 28'};
  const output=docket([
   claim(A,71,{endpoint:endpoint(5)}),
   claim(B,72,{endpoint:changed,studyFamilyId:'study-beta',
    finding:'reported-no-response'})
  ]);
  expect(output.cases[0]?.context).toBe('reported-context-differs');
 });
 it('detects shared trial registry even when publication study-family labels differ',()=>{
  const output=docket([
   claim(A,71,{studyIdentity:registered('NCT12345678')}),
   claim(B,72,{studyFamilyId:'study-beta',studyIdentity:registered('NCT12345678')})
  ]);
  expect(output.cases[0]?.reasons).toContain('study-registration-overlap');
 });
 it('does not compare a different therapy or two revisions of the same claim series',()=>{
  expect(docket([
   claim(A,71),claim(B,72,{therapy:'ALYFTREK',
    finding:'reported-no-response'})
  ]).cases).toHaveLength(0);
  expect(docket([
   claim(A,71),claim(B,72,{seriesId:A,revision:2,
    parentClaimId:A,finding:'reported-no-response'})
  ]).cases).toHaveLength(0);
 });
 it('excludes pending records, malformed independent approvals and orphaned references',()=>{
  const output=docket([
   claim(A,71),
   claim(B,72,{status:'pending',reviewCount:1,reviewSeals:[],reviewedAt:null}),
   claim(C,73)
  ]);
  expect(output.cases).toHaveLength(0);
  expect(output.excludedSourceClaims).toBe(2);
  expect(docket([
   claim(A,71,{reviewSeals:['x','x']}),
   claim(B,72)
  ]).excludedSourceClaims).toBe(1);
 });
 it('rejects cross-variant and duplicate reference or claim inventories',()=>{
  expect(()=>docket([claim(A,71,{variantId:'19'})])).toThrow();
  expect(()=>docket([claim(A,71),claim(A,72)])).toThrow();
  expect(()=>docket([claim(A,71)],[ref(71),ref(71)])).toThrow();
  expect(()=>docket([claim(A,71)],[],201)).toThrow();
 });
 it('reports limited output instead of silently claiming full pair coverage',()=>{
  const claims=[claim(A,71),claim(B,72),claim(C,73)];
  const output=docket(claims,[ref(71),ref(72),ref(73)],1);
  expect(output.cases).toHaveLength(1);
  expect(output.totalCandidates).toBe(3);
  expect(output.limited).toBe(true);
 });
});
describe('14H200 scientific research reconciliation notes',()=>{
 const item=docket([
  claim(A,71),claim(B,72,{finding:'reported-no-response'})
 ]).cases[0]!;
 const input={
  questionKind:'study-overlap' as const,
  question:'Do the two original publications analyze the same underlying study population?',
  sourceContext:'Both reports share a source study family, but independent cohort status is not documented.',
  followUp:'Examine registry details and original Methods before treating the experiments as independent.',
  createdAt:'2026-11-18T00:00:00Z'
 };
 it('produces explicitly unreviewed portable notes including both originals and limitations',()=>{
  const note=createReconciliationResearchNote(item,input);
  expect(note.status).toBe('unreviewed-local-working-note');
  expect(note.clinicalConclusionProvided).toBe(false);
  expect(note.sourceClaims).toHaveLength(2);
  expect(note.sourceClaims[0].sourceUrl).toContain('https://');
  const exported=portableReconciliationResearchNotes([note]);
  expect(exported).toContain('research-only-not-clinical');
  expect(exported).toContain('Unreviewed working notes');
  expect(exported).not.toContain('patientRecommendation');
 });
 it('rejects incomplete or fabricated reconciliation decisions',()=>{
  expect(()=>createReconciliationResearchNote(item,{...input,question:'sure'})).toThrow();
  expect(()=>createReconciliationResearchNote(item,{...input,followUp:'none'})).toThrow();
  expect(()=>createReconciliationResearchNote(item,{...input,createdAt:'no'})).toThrow();
  const note=createReconciliationResearchNote(item,input);
  expect(()=>portableReconciliationResearchNotes([
   {...note,status:'approved' as typeof note.status}
  ])).toThrow();
 });
});
