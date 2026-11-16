import {describe,it,expect} from 'vitest';
import {
 UNEXTRACTED_ENDPOINT,validResearchEndpoint,endpointComparisonKey,endpointReadiness,
 endpointDisplayValue,type ResearchEndpoint
} from './researchEndpointNormalization';
import {reconcileReviewedSourceClaims,type DoubleReviewedSourceClaim} from './sourceConflictReconciliation';

const base:ResearchEndpoint={
 code:'sweat-chloride',statistic:'change-from-baseline',unit:'mmol/L',
 value:-22.4,model:'clinical',comparator:'baseline',timepoint:'Day 28'
};
const obs=(id:string,family:string,endpoint:ResearchEndpoint):DoubleReviewedSourceClaim=>({
 id,variantId:'18',therapy:'ETI',scope:'single-variant',
 method:'clinical-study',finding:'reported-response',studyFamilyId:family,
 referenceId:71,locator:'Original paper · Table 2',
 reviewedBy:['reviewer-a','reviewer-b'],reviewedAt:'2026-09-14T12:00:00Z',
 endpoint
});
describe('14H167 structured experimental endpoints',()=>{
 it('keeps not-extracted as an explicit, nonnumeric valid result',()=>{
  expect(validResearchEndpoint(UNEXTRACTED_ENDPOINT)).toBe(true);
  expect(endpointReadiness(UNEXTRACTED_ENDPOINT)).toBe('unextracted');
  expect(endpointDisplayValue(UNEXTRACTED_ENDPOINT)).toBe('No numeric endpoint recorded');
 });
 it('accepts valid source numeric and clinically different assay units',()=>{
  expect(validResearchEndpoint(base)).toBe(true);
  expect(validResearchEndpoint({...base,code:'ppfev1',statistic:'change-from-baseline',unit:'pp',value:5.5})).toBe(true);
  expect(validResearchEndpoint({...base,code:'cftr-current',statistic:'absolute',unit:'uA/cm2',model:'cell-line',value:15})).toBe(true);
  expect(endpointDisplayValue(base)).toContain('-22.4');
 });
 it('rejects incompatible units, invalid numerical values, missing controls and implied measurements',()=>{
  expect(validResearchEndpoint({...base,unit:'%'})).toBe(false);
  expect(validResearchEndpoint({...base,code:'ppfev1',unit:'mmol/L'})).toBe(false);
  expect(validResearchEndpoint({...base,value:Number.NaN})).toBe(false);
  expect(validResearchEndpoint({...base,value:Number.POSITIVE_INFINITY})).toBe(false);
  expect(validResearchEndpoint({...base,value:1e9})).toBe(false);
  expect(validResearchEndpoint({...base,model:'not-reported'})).toBe(false);
  expect(validResearchEndpoint({...base,comparator:'not-reported'})).toBe(false);
  expect(validResearchEndpoint({...base,timepoint:'not-reported'})).toBe(false);
  expect(validResearchEndpoint({...base,code:'not-reported',value:3})).toBe(false);
 });
 it('retains qualitative source category without invented numerical values',()=>{
  const qualitative:ResearchEndpoint={...base,value:null,statistic:'not-reported',
   unit:'not-reported',timepoint:'not-reported'};
  expect(validResearchEndpoint(qualitative)).toBe(true);
  expect(endpointReadiness(qualitative)).toBe('qualitative');
  expect(endpointComparisonKey(qualitative,'single-variant',undefined,'clinical-study')).toBeNull();
 });
 it('only groups exact endpoint context, never generic unit or assay equivalence',()=>{
  const key=endpointComparisonKey(base,'single-variant',undefined,'clinical-study');
  expect(key).not.toBeNull();
  for(const different of [
   {...base,statistic:'absolute' as const},
   {...base,unit:'%' as const},
   {...base,model:'other' as const},
   {...base,comparator:'placebo' as const},
   {...base,timepoint:'Day 56'},
   {...base,code:'organoid-fis' as const},
  ])expect(endpointComparisonKey(different,'single-variant',undefined,'clinical-study')).not.toBe(key);
  expect(endpointComparisonKey(base,'genotype-specific',['18','19'],'clinical-study')).not.toBe(key);
  expect(endpointComparisonKey(base,'single-variant',undefined,'in-vitro-study')).not.toBe(key);
 });
 it('keeps source values visible without mean, standard deviation, effect size or clinical prediction',()=>{
  const result=reconcileReviewedSourceClaims('18','ETI',[
   obs('claim-a','study-a',base),
   obs('claim-b','study-b',{...base,value:-18.2}),
   obs('claim-c','study-c',{...base,value:-10.4,timepoint:'Day 56'}),
   obs('claim-d','study-d',{...base,code:'other',unit:'study-specific',value:12.3}),
  ],[71]);
  expect(result.numericEndpointRows).toBe(4);
  expect(result.incomparableEndpointRows).toBe(1);
  expect(result.endpointGroups).toHaveLength(2);
  expect(result.endpointGroups[0]?.values).toEqual([-22.4,-18.2]);
  expect(result.endpointGroups[0]?.independentStudyFamilies).toBe(2);
  expect(result.endpointGroups[1]?.values).toEqual([-10.4]);
  expect('mean' in result).toBe(false);
 });
 it('never counts duplicate source observations as independent studies',()=>{
  const result=reconcileReviewedSourceClaims('18','ETI',[
   obs('a','study-a',base),
   obs('b','study-a',{...base,value:-21.1}),
  ],[71]);
  expect(result.endpointGroups[0]?.observationCount).toBe(2);
  expect(result.endpointGroups[0]?.independentStudyFamilies).toBe(1);
  expect(result.verifiedStudyFamilies).toBe(1);
 });
});
