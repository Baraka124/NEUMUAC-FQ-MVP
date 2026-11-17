import {describe,it,expect} from 'vitest';
import {compareCrossVariantEvidence} from './crossVariantEvidence';
import {buildMultiTherapyResearchReport} from './multiTherapyResearch';
import {projectVariantTherapies} from './therapyRegistry';
import type {ResearchHistory} from '../services/liveResearchHistory';

const history:ResearchHistory={validations:[],conflicts:[]};
function report(id:string,eti:'responsive'|'non_responsive'|'unknown'|null){
 const profile=projectVariantTherapies({
  id,functionalClass:'II',classSubtype:null,validationCount:null,
  eti,alyftrek:null,etiEvidenceLevel:null,alyftrekEvidenceLevel:null,
  etiEvidenceTier:null,alyftrekEvidenceTier:null,etiAuthority:null,alyftrekAuthority:null
 });
 return buildMultiTherapyResearchReport({
  variantId:id,therapyProfile:profile,references:[],
  history,archivedEvidence:[],reviewedObservations:[]
 });
}
describe('14H181–182 cross-variant evidence comparisons',()=>{
 it('compares five preserved therapy rows without interpreting class as therapeutic equivalence',()=>{
  const result=compareCrossVariantEvidence(report('18','responsive'),report('19','non_responsive'),'II','II');
  expect(result.rows).toHaveLength(5);
  expect(result.rows.find(x=>x.therapy==='ETI')?.recordedLabelsDiffer).toBe(true);
  expect(result.sharedClass).toBe(true);
  expect(result.clinicalEquivalence).toBe(false);
  expect(result.recommendationProvided).toBe(false);
  expect(result.hypotheses.some(x=>x.includes('class alone'))).toBe(true);
 });
 it('does not misrepresent missing independently reviewed studies as nonresponse',()=>{
  const result=compareCrossVariantEvidence(report('18',null),report('19',null),null,null);
  expect(result.sharedClass).toBeNull();
  expect(result.rows.every(x=>x.firstReviewedFamilies===0&&x.secondReviewedFamilies===0)).toBe(true);
  expect(result.hypotheses.some(x=>x.includes('not biological non-response'))).toBe(true);
 });
 it('rejects self-comparison, partial or duplicated therapy categories',()=>{
  const first=report('18','responsive');
  expect(()=>compareCrossVariantEvidence(first,first,'II','II')).toThrow();
  expect(()=>compareCrossVariantEvidence(
   {...first,assessedTherapies:first.assessedTherapies.slice(0,4)},
   report('19',null),'II','II'
  )).toThrow();
  expect(()=>compareCrossVariantEvidence(
   first,{...report('19',null),assessedTherapies:[
    ...report('19',null).assessedTherapies.slice(0,4),
    report('19',null).assessedTherapies[0]!
   ]},'II','II'
  )).toThrow();
 });
});
