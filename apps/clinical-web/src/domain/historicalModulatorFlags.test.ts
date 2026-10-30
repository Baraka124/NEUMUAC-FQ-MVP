import {describe,it,expect} from 'vitest';
import {decodeHistoricalModulatorFlags,assessHistoricalFlag,historicalFlagFindings} from './historicalModulatorFlags';
import {projectVariantTherapies} from './therapyRegistry';
describe('14H26 independently recorded historical drug flags',()=>{
 it('preserves nonresponsive G542X despite conflicting ETI boolean',()=>{
  const p=projectVariantTherapies({id:'19',functionalClass:'I',classSubtype:'exceptional',
   validationCount:0,eti:'non_responsive',alyftrek:'unknown',
   etiEvidenceLevel:null,alyftrekEvidenceLevel:null,etiEvidenceTier:null,alyftrekEvidenceTier:null,
   etiAuthority:null,alyftrekAuthority:null,legacyDrugFlags:decodeHistoricalModulatorFlags({eti:true})});
  expect(p.entries[0].response).toBe('non_responsive');
  expect(historicalFlagFindings(p)[0].state).toBe('different-recorded-fields');
  expect(historicalFlagFindings(p)[1].state).toBe('not-comparable');
 });
 it('recognizes true Class I Alyftrek exception without conflating ETI',()=>{
  const flags=decodeHistoricalModulatorFlags({eti:false,alyftrek:true});
  expect(assessHistoricalFlag('non_responsive',flags.eti)).toBe('same-recorded-fields');
  expect(assessHistoricalFlag('responsive',flags.alyftrek)).toBe('same-recorded-fields');
 });
 it('never treats absent Alyftrek flag as a negative category',()=>{
  expect(decodeHistoricalModulatorFlags({eti:false}).alyftrek).toBeNull();
  expect(assessHistoricalFlag('responsive',null)).toBe('not-comparable');
  expect(assessHistoricalFlag('unknown',false)).toBe('not-comparable');
 });
 it('rejects malformed recorded flag types instead of coercing them',()=>{
  for(const x of ['yes',[],{eti:'true'},{eti:1},{alyftrek:0}])
   expect(()=>decodeHistoricalModulatorFlags(x)).toThrow();
 });
 it('does not promote true/false into a clinical recommendation',()=>{
  expect(assessHistoricalFlag('responsive',false)).toBe('different-recorded-fields');
  expect(assessHistoricalFlag('non_responsive',true)).toBe('different-recorded-fields');
 });
});
