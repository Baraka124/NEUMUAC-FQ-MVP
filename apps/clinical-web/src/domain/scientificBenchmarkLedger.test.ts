import {describe,it,expect} from 'vitest';
import {buildScientificBenchmarkLedger} from './scientificBenchmarkLedger';
import type {BenchmarkCaseInput} from './scientificBenchmarkLedger';
import type {ExpertExtraction} from './expertBenchmarkAdjudication';

const base:BenchmarkCaseInput={
 caseId:'g551d-ivacaftor-2011',variantId:'18',references:[],claims:[],extracts:[]
};
const e1:ExpertExtraction={
 caseId:'g551d-ivacaftor-2011',variantId:'18',pmid:'22047557',
 reviewerId:'researcher-alpha',submittedAt:'2026-11-18T11:00:00Z',
 sourceLocator:'Table 2',genotypeContext:'G551D-containing genotype',
 endpoint:'Sweat chloride',modelOrCohort:'Randomized cohort',
 finding:'inconclusive',claimId:null,methodNotes:'Independent blinded research extraction'
};
const e2:ExpertExtraction={...e1,reviewerId:'researcher-beta'};
describe('14H203 reproducible bibliography challenge ledger',()=>{
 it('preserves an empty run without manufacturing an accuracy rate',()=>{
  const report=buildScientificBenchmarkLedger([]);
  expect(report.includedCases).toBe(0);
  expect(report.bibliographyCount).toBe(3);
  expect(report.agreementRate).toBeNull();
  expect(report.scientificAccuracyValidated).toBe(false);
 });
 it('keeps cases with no expert review in the denominator',()=>{
  const report=buildScientificBenchmarkLedger([base]);
  expect(report.includedCases).toBe(1);
  expect(report.counts['missing-expert-reviews']).toBe(1);
  expect(report.evaluatedCases[0]?.pmid).toBe('22047557');
 });
 it('never computes an efficacy or benchmark accuracy rate from fixtures',()=>{
  const report=buildScientificBenchmarkLedger([
   {...base,extracts:[e1,e2]},
   {...base,caseId:'phe508del-mf-eti-2019',variantId:'19',extracts:[]}
  ]);
  expect(report.includedCases).toBe(2);
  expect(report.counts['missing-source-claim']).toBe(1);
  expect(report.counts['missing-expert-reviews']).toBe(1);
  expect(report.agreementRate).toBeNull();
  expect(report.patientCareUse).toBe(false);
 });
 it('rejects duplicate or invented challenge variants',()=>{
  expect(()=>buildScientificBenchmarkLedger([base,base])).toThrow();
  expect(()=>buildScientificBenchmarkLedger([{...base,caseId:'fake-study'}])).toThrow();
  expect(()=>buildScientificBenchmarkLedger([{...base,variantId:'not-a-real-id'}])).toThrow();
 });
 it('generates deterministic row order across arbitrary caller order',()=>{
  const a={...base,caseId:'phe508del-mf-eti-2019',variantId:'19'};
  const x=buildScientificBenchmarkLedger([a,base]);
  const y=buildScientificBenchmarkLedger([base,a]);
  expect(x).toEqual(y);
 });
});
