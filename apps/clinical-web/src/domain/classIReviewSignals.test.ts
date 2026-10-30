import {describe,it,expect} from 'vitest';
import {projectVariantTherapies} from './therapyRegistry';
import {classIReviewSignals} from './classIReviewSignals';
const make=(id:string,subtype:string|null,eti:'responsive'|'non_responsive'|'unknown'|null,aly:'responsive'|'non_responsive'|'unknown'|null)=>{
 return projectVariantTherapies({
  id,functionalClass:'I',classSubtype:subtype,validationCount:0,
  eti,alyftrek:aly,etiEvidenceLevel:null,alyftrekEvidenceLevel:null,
  etiEvidenceTier:null,alyftrekEvidenceTier:null,etiAuthority:null,alyftrekAuthority:null
 });
};
/** Recorded original IDs. Regression data is a CI fixture, not clinical adjudication. */
const originalCases=[
 ['1','exceptional','responsive','unknown'],
 ['2','exceptional','responsive','unknown'],
 ['4','exceptional','responsive','unknown'],
 ['5','exceptional','responsive','unknown'],
 ['6','exceptional','responsive','unknown'],
 ['984','exceptional','responsive','unknown'],
 ['1461','exceptional','responsive','unknown'],
 ['2081','exceptional','responsive','unknown'],
 ['2442','exceptional','responsive','unknown'],
 ['2443','exceptional','responsive','unknown'],
 ['2444','exceptional','responsive','unknown'],
 ['2445','exceptional','responsive','unknown'],
 ['2446','exceptional','responsive','unknown'],
 ['2447','exceptional','responsive','unknown'],
 ['2691','exceptional','responsive','unknown'],
 ['19','exceptional','non_responsive','unknown'],
 ['35','true','non_responsive','responsive'],
 ['86','true','non_responsive','responsive'],
 ['351','true','non_responsive','responsive']
] as const;
describe('14H12 exact original Class I exception regression',()=>{
 it('retains all 16 exceptional-subtype records and 3 Alyftrek-only responsive cases',()=>{
  expect(originalCases.filter(x=>x[1]==='exceptional')).toHaveLength(16);
  expect(originalCases.filter(x=>x[1]==='exceptional'&&x[2]==='responsive')).toHaveLength(15);
  expect(originalCases.filter(x=>x[3]==='responsive'&&x[2]==='non_responsive')).toHaveLength(3);
  for(const [id,subtype,eti,aly] of originalCases){
   const profile=make(id,subtype,eti,aly);
   expect(profile.entries[0].response).toBe(eti);
   expect(profile.entries[1].response).toBe(aly);
   expect(profile.classSubtype).toBe(subtype);
   expect(profile.entries.slice(2).every(e=>e.response===null)).toBe(true);
  }
 });
 it('does not call exceptional G542X an ETI responder',()=>{
  const p=make('19','exceptional','non_responsive','unknown');
  const signals=classIReviewSignals(p);
  expect(p.entries[0].response).toBe('non_responsive');
  expect(signals.map(s=>s.kind)).toContain('exceptional-subtype-without-eti-response');
  expect(signals.map(s=>s.kind)).not.toContain('unflagged-class-i-eti-response');
 });
 it('does not automatically flag the 15 already marked exceptional responders as class errors',()=>{
  for(const [id,subtype,eti,aly] of originalCases.filter(x=>x[1]==='exceptional'&&x[2]==='responsive')){
   const signals=classIReviewSignals(make(id,subtype,eti,aly));
   expect(signals.map(s=>s.kind)).not.toContain('unflagged-class-i-eti-response');
   expect(signals.map(s=>s.kind)).toContain('validation-not-recorded');
  }
 });
 it('distinguishes ETI-nonresponse with Alyftrek response from a class contradiction',()=>{
  for(const [id,subtype,eti,aly] of originalCases.filter(x=>x[3]==='responsive')){
   const p=make(id,subtype,eti,aly);
   expect(classIReviewSignals(p).map(s=>s.kind)).toContain('class-i-drug-divergence');
   expect(p.entries[1].response).toBe('responsive');
  }
 });
 it('routes unexpected Class I responsive without exceptional subtype for review, never mutates',()=>{
  const p=make('9000','true','responsive','unknown');
  expect(classIReviewSignals(p).map(s=>s.kind)).toContain('unflagged-class-i-eti-response');
  expect(p.classSubtype).toBe('true');
  expect(p.entries[0].response).toBe('responsive');
 });
 it('does not apply Class I exception logic to other classes',()=>{
  const p={...make('20','standard','responsive','unknown'),functionalClass:'II'};
  expect(classIReviewSignals(p)).toEqual([]);
 });
});
