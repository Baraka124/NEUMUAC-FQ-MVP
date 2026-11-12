import {describe,it,expect} from 'vitest';
import {projectVariantTherapies,type RecordedResponse} from './therapyRegistry';
import {compareLegacyFiveRegimens,hasExactF508delName,type NamedVariant} from './legacyFiveRegimenRules';
import {originalPairReviewFindings} from './originalPairReviewFindings';

function variant(
 id:string,name:string,cls:string|null,subtype:string|null,
 eti:RecordedResponse,aly:RecordedResponse,etiTier:string|null=null,alyTier:string|null=null
):NamedVariant{
 return {id,names:[name],profile:projectVariantTherapies({
  id,functionalClass:cls,classSubtype:subtype,validationCount:0,eti,alyftrek:aly,
  etiEvidenceTier:etiTier,alyftrekEvidenceTier:alyTier,etiEvidenceLevel:null,
  alyftrekEvidenceLevel:null,etiAuthority:null,alyftrekAuthority:null
 })};
}
function check(a:NamedVariant,b:NamedVariant){
 const outcomes=compareLegacyFiveRegimens(a,b);
 const snapshot=JSON.stringify({a,b,outcomes});
 const findings=originalPairReviewFindings(a,b,outcomes);
 expect(JSON.stringify({a,b,outcomes})).toBe(snapshot);
 return findings;
}
describe('14H133 original compound-het MDT/review context preserved without rewriting science',()=>{
 it('keeps exceptional Class I and missing ETI response independent of direct-tier ETI match',()=>{
  const a=variant('1','E831X','I','exceptional','responsive','unknown','frt_assay');
  const b=variant('19','G542X','I','exceptional',null,'unknown');
  const findings=check(a,b);
  expect(findings.map(f=>f.kind)).toContain('class-i-exceptional');
  expect(findings.map(f=>f.kind)).toContain('eti-unrecorded');
  expect(findings.map(f=>f.kind)).toContain('eti-non-f508-mdt');
  expect(findings.find(f=>f.kind==='eti-non-f508-mdt')?.therapy).toBe('ETI');
  expect(a.profile.entries[0].response).toBe('responsive');
  expect(b.profile.entries[0].response).toBeNull();
 });
 it('captures the original Alyftrek review, ETI nonresponse, and rule-only match without claiming eligibility',()=>{
  const a=variant('35','3120+1G>A','I','true','non_responsive','responsive',null,'clinical_trial');
  const b=variant('19','G542X','I','exceptional','unknown','unknown');
  const findings=check(a,b);
  expect(findings.map(f=>f.kind)).toEqual(expect.arrayContaining([
   'class-i-exceptional','eti-unrecorded','eti-record-disagreement',
   'alyftrek-eti-review','alyftrek-eti-nonresponse','alyftrek-rule-only-match'
  ]));
  expect(findings.filter(f=>f.therapy==='ALYFTREK')).toHaveLength(3);
  expect(a.profile.entries[1].response).toBe('responsive');
 });
 it('does not add review caveats when ETI is matched and exact F508del is present',()=>{
  const a=variant('1','F508del','II',null,'responsive','responsive','frt_assay');
  const b=variant('2','G551D','III',null,'responsive','responsive','frt_assay');
  const findings=check(a,b);
  expect(findings.map(f=>f.kind)).not.toContain('eti-non-f508-mdt');
  expect(findings.map(f=>f.kind)).not.toContain('eti-unrecorded');
  expect(findings.map(f=>f.kind)).not.toContain('alyftrek-eti-review');
  expect(findings).toHaveLength(0);
 });
 it('requires exact F508del rather than matching compound-looking names',()=>{
  const a=variant('3','F508del+G551D','II',null,'responsive','unknown','clinical_trial');
  const b=variant('4','G542X','I',null,'non_responsive','unknown');
  expect(hasExactF508delName(a)).toBe(false);
  expect(hasExactF508delName(variant('5','p.Phe508del','II',null,'unknown','unknown'))).toBe(true);
  expect(check(a,b).map(f=>f.kind)).toContain('eti-non-f508-mdt');
 });
 it('remains symmetric when the two research records are swapped',()=>{
  const a=variant('35','3120+1G>A','I','true','non_responsive','responsive',null,'clinical_trial');
  const b=variant('19','G542X','I','exceptional','unknown','unknown');
  expect(check(a,b)).toEqual(check(b,a));
 });
 it('never turns a missing evidence tier into an ETI match or spurious MDT rule',()=>{
  const a=variant('6','E831X','I','exceptional','responsive','unknown');
  const b=variant('7','G542X','I',null,'unknown','unknown');
  const rules=compareLegacyFiveRegimens(a,b);
  expect(rules.find(x=>x.therapy==='ETI')?.outcome).toBe('needs-evidence');
  expect(originalPairReviewFindings(a,b,rules).some(f=>f.kind==='eti-non-f508-mdt')).toBe(false);
 });
});
