import {describe,it,expect} from 'vitest';
import {projectVariantTherapies,type RecordedResponse} from './therapyRegistry';
import type {NamedVariant} from './legacyFiveRegimenRules';
import {compareLegacyFiveRegimens} from './legacyFiveRegimenRules';
import {describeOriginalPairVerdict} from './originalPairVerdictContext';
function v(id:string,name:string,cls:string|null,subtype:string|null,eti:RecordedResponse,aly:RecordedResponse,etiTier:string|null=null,alyTier:string|null=null):NamedVariant{
 return {id,names:[name],profile:projectVariantTherapies({
  id,functionalClass:cls,classSubtype:subtype,validationCount:null,eti,alyftrek:aly,
  etiEvidenceLevel:null,alyftrekEvidenceLevel:null,etiEvidenceTier:etiTier,
  alyftrekEvidenceTier:alyTier,etiAuthority:null,alyftrekAuthority:null
 })};
}
function ctx(a:NamedVariant,b:NamedVariant){
 const rules=compareLegacyFiveRegimens(a,b);
 const before=JSON.stringify({a,b,rules});
 const original=describeOriginalPairVerdict(a,b,rules);
 expect(JSON.stringify({a,b,rules})).toBe(before);
 expect(Object.isFrozen(original)).toBe(true);
 return original;
}
describe('14H135 parity: original pair-verdict descriptors, not prescribing conclusions',()=>{
 it('selects the same historical class-order record and ties to the first allele',()=>{
  const a=v('1','E831X','I','exceptional','responsive','unknown','frt_assay');
  const b=v('2','F508del','II',null,'non_responsive','unknown');
  expect(ctx(a,b).originalClassOrderSelectedId).toBe('1');
  expect(ctx(b,a).originalClassOrderSelectedId).toBe('1');
  expect(ctx(a,a).originalClassOrderSelectedId).toBe('1');
  expect(ctx(a,b).originalEtiResponsiveRecordId).toBe('1');
  const unknown=v('3','G542X',null,null,null,'unknown');
  expect(ctx(unknown,b).originalClassOrderSelectedId).toBe('2');
 });
 it('independently reports ETI missingness, divergent values and Class I exceptions',()=>{
  const a=v('1','E831X','I','exceptional','responsive','unknown','frt_assay');
  const b=v('19','G542X','I','exceptional',null,'unknown');
  const c=ctx(a,b);
  expect(c.bothSameClass).toBe(true);
  expect(c.classIDeclaredExceptional).toBe(true);
  expect(c.etiFirstUnrecorded).toBe(false);
  expect(c.etiSecondUnrecorded).toBe(true);
  expect(c.anyEtiUnrecorded).toBe(true);
  expect(c.etiValuesDiffer).toBe(false);
  expect(c.originalEtiResponsiveRecordId).toBe('1');
  expect(c.researchMatchHasEtiUncertainty).toBe(true);
 });
 it('keeps Alyftrek-only rule match and expansion review distinct from ETI response',()=>{
  const a=v('35','3120+1G>A','I','true','non_responsive','responsive',null,'clinical_trial');
  const b=v('19','G542X','I','exceptional','unknown','unknown');
  const c=ctx(a,b);
  expect(c.etiValuesDiffer).toBe(true);
  expect(c.alyftrekOnlyRuleMatched).toBe(true);
  expect(c.alyftrekExpansionReview).toBe(true);
  expect(c.originalEtiResponsiveRecordId).toBeNull();
  expect(c.matchedRuleCount).toBeGreaterThan(0);
 });
 it('keeps five independent original rule outcomes across all Class I response combinations',()=>{
  const values=[null,'unknown','non_responsive','responsive'] as const;
  for(const etiA of values)for(const etiB of values){
   const a=v('7','E831X','I','exceptional',etiA,'unknown',etiA==='responsive'?'frt_assay':null);
   const b=v('8','G542X','I','exceptional',etiB,'unknown');
   const rules=compareLegacyFiveRegimens(a,b);
   const ruleSnapshot=JSON.stringify(rules);
   const c=describeOriginalPairVerdict(a,b,rules);
   expect(JSON.stringify(rules)).toBe(ruleSnapshot);
   expect(rules).toHaveLength(5);
   expect(c.anyEtiUnrecorded).toBe([etiA,etiB].some(x=>x===null||x==='unknown'));
   expect(c.etiValuesDiffer).toBe(Boolean(etiA)&&Boolean(etiB)&&etiA!==etiB);
  }
 });
 it('never calls a missing source record proof of ETI nonresponse or eligibility',()=>{
  const a=v('1','R117H','IV',null,null,'unknown');
  const b=v('2','G551D','III',null,null,'unknown');
  const c=ctx(a,b);
  expect(c.originalEtiResponsiveRecordId).toBeNull();
  expect(c.anyEtiUnrecorded).toBe(true);
  expect(c.bothSameClass).toBe(false);
 });
});
