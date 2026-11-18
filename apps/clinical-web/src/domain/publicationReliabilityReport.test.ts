import {describe,it,expect} from 'vitest';
import {buildScientificBenchmarkLedger} from './scientificBenchmarkLedger';
import {buildPublicationReliabilityReport} from './publicationReliabilityReport';
import type {BenchmarkCaseInput} from './scientificBenchmarkLedger';
import type {ExpertExtraction} from './expertBenchmarkAdjudication';
const a:BenchmarkCaseInput={
 caseId:'g551d-ivacaftor-2011',variantId:'18',references:[],claims:[],extracts:[]
};
const e:ExpertExtraction={
 caseId:'g551d-ivacaftor-2011',variantId:'18',pmid:'22047557',
 reviewerId:'expert-one',submittedAt:'2026-11-18T10:00:00Z',
 sourceLocator:'Table 2',genotypeContext:'G551D-containing genotype',
 endpoint:'sweat chloride',modelOrCohort:'clinical cohort',
 finding:'inconclusive',claimId:null,methodNotes:'Synthetic software boundary test only'
};
const b={...e,reviewerId:'expert-two',submittedAt:'2026-11-18T10:01:00Z'};
describe('14H205 publication reliability accounting',()=>{
 it('has no efficacy or accuracy estimates when benchmark is empty',()=>{
  const report=buildPublicationReliabilityReport(buildScientificBenchmarkLedger([]));
  expect(report.observedChallenges).toBe(0);
  expect(report.publicationsWithChallenges).toBe(0);
  expect(report.accuracy).toBeNull();
  expect(report.sensitivity).toBeNull();
  expect(report.specificity).toBeNull();
 });
 it('preserves missing-source and unreviewed denominators by publication',()=>{
  const ledger=buildScientificBenchmarkLedger([
   a,{...a,variantId:'19',extracts:[{...e,variantId:'19'}, {...b,variantId:'19'}]},
   {...a,caseId:'phe508del-mf-eti-2019',variantId:'20'}
  ]);
  const report=buildPublicationReliabilityReport(ledger);
  expect(report.observedChallenges).toBe(3);
  expect(report.publicationsWithChallenges).toBe(2);
  expect(report.statusCounts['missing-expert-reviews']).toBe(2);
  expect(report.statusCounts['missing-source-claim']).toBe(1);
  expect(report.publicationRows.find(r=>r.pmid==='22047557')?.challengeVariants).toBe(2);
  expect(report.clinicalDecisionSupport).toBe(false);
 });
 it('rejects disagreement between detail rows and aggregate counters',()=>{
  const valid=buildScientificBenchmarkLedger([a]);
  const invalid={...valid,counts:{...valid.counts,'missing-expert-reviews':0}};
  expect(()=>buildPublicationReliabilityReport(invalid)).toThrow();
 });
 it('produces stable publication order without inventing rates',()=>{
  const first=buildPublicationReliabilityReport(buildScientificBenchmarkLedger([
   {...a,caseId:'phe508del-mf-eti-2019',variantId:'20'},a
  ]));
  const second=buildPublicationReliabilityReport(buildScientificBenchmarkLedger([
   a,{...a,caseId:'phe508del-mf-eti-2019',variantId:'20'}
  ]));
  expect(first).toEqual(second);
  expect(first.publicationRows.every(r=>r.externallyValidated===false)).toBe(true);
 });
});
