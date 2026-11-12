import {describe,it,expect} from 'vitest';
import {projectVariantTherapies} from './therapyRegistry';
import {compareLegacyFiveRegimens,type NamedVariant} from './legacyFiveRegimenRules';
function v(id:string,name:string,cls:string,subtype:string|null,eti:'responsive'|'non_responsive'|'unknown'|null,
 aly:'responsive'|'non_responsive'|'unknown'|null,etiTier:string|null=null,alyTier:string|null=null):NamedVariant{
 return {id,names:[name],profile:projectVariantTherapies({
  id,functionalClass:cls,classSubtype:subtype,validationCount:0,eti,alyftrek:aly,
  etiEvidenceTier:etiTier,alyftrekEvidenceTier:alyTier,
  etiEvidenceLevel:null,alyftrekEvidenceLevel:null,etiAuthority:null,alyftrekAuthority:null
 })};
}
const result=(a:NamedVariant,b:NamedVariant,id:string)=>compareLegacyFiveRegimens(a,b).find(x=>x.therapy===id);
describe('14H15 frozen five-regimen research-rule parity',()=>{
 it('evaluates exactly five original regimens and never claims drug approval',()=>{
  const a=v('1','F508del','II',null,'responsive','responsive','frt_assay');
  const b=v('2','F508del','II',null,'responsive','responsive','frt_assay');
  const all=compareLegacyFiveRegimens(a,b);
  expect(all).toHaveLength(5);
  expect(all.every(x=>['match','not-matched','needs-evidence'].includes(x.outcome))).toBe(true);
  expect(all.filter(x=>x.therapy==='LUMACAFTOR_IVACAFTOR')[0].outcome).toBe('match');
  expect(all.find(x=>x.therapy==='TEZACAFTOR_IVACAFTOR')?.outcome).toBe('match');
 });
 it('does not treat compound-looking F508del names as exact Orkambi homozygous',()=>{
  const a=v('1','F508del+G551D','II',null,'responsive','unknown','frt_assay');
  const b=v('2','F508del','II',null,'responsive','unknown','frt_assay');
  expect(result(a,b,'LUMACAFTOR_IVACAFTOR')?.outcome).toBe('not-matched');
 });
 it('matches the original exact Kalydeco list but not D110E',()=>{
  const a=v('1','D110H','IV',null,'unknown','unknown');
  const b=v('2','D110E','IV',null,'unknown','unknown');
  expect(result(a,b,'IVACAFTOR')?.outcome).toBe('match');
  expect(result(b,b,'IVACAFTOR')?.outcome).toBe('not-matched');
 });
 it('preserves exceptional Class I ETI response without inventing qualifying evidence',()=>{
  const exceptional=v('1','E831X','I','exceptional','responsive','unknown');
  const other=v('2','G542X','I','exceptional','non_responsive','unknown');
  expect(result(exceptional,other,'ETI')?.outcome).toBe('needs-evidence');
  expect(exceptional.profile.entries[0].response).toBe('responsive');
  expect(other.profile.entries[0].response).toBe('non_responsive');
 });
 it('supports direct Class I Alyftrek trial-tier exception independently of ETI',()=>{
  const a=v('35','3120+1G>A','I','true','non_responsive','responsive',null,'clinical_trial');
  const b=v('19','G542X','I','exceptional','non_responsive','unknown');
  expect(result(a,b,'ALYFTREK')?.outcome).toBe('match');
  expect(result(a,b,'ETI')?.outcome).toBe('needs-evidence');
 });
 it('does not silently classify both unknown Class I as Alyftrek matched',()=>{
  const a=v('1','G542X','I','exceptional','unknown','unknown');
  const b=v('2','E831X','I','exceptional','unknown','unknown');
  expect(result(a,b,'ALYFTREK')?.outcome).toBe('not-matched');
 });
 it('rejects identity mismatch and never rewrites class, subtype or response',()=>{
  const a=v('1','F508del','I','exceptional','responsive','unknown');
  const b=v('2','G542X','I','exceptional','non_responsive','unknown');
  const before=JSON.stringify(a);
  compareLegacyFiveRegimens(a,b);
  expect(JSON.stringify(a)).toBe(before);
  expect(()=>compareLegacyFiveRegimens({...a,id:'3'},b)).toThrow();
 });
});

describe('14H63–65 five-regimen behavioral parity matrix',()=>{
 it('is symmetric under swapping the two selected research variants',()=>{
  const a=v('31','F508del','II',null,'responsive','unknown','frt_assay');
  const b=v('32','G551D','III',null,'unknown','unknown');
  const forward=compareLegacyFiveRegimens(a,b);
  const reversed=compareLegacyFiveRegimens(b,a);
  expect(forward).toEqual(reversed);
  expect(forward.find(x=>x.therapy==='TEZACAFTOR_IVACAFTOR')?.outcome).toBe('match');
  expect(forward.find(x=>x.therapy==='LUMACAFTOR_IVACAFTOR')?.outcome).toBe('not-matched');
 });
 it('does not turn a recorded ETI response into rule match without qualifying source tier',()=>{
  const a=v('41','G542X','I','exceptional','responsive','unknown');
  const b=v('42','D110E','I',null,'non_responsive','unknown');
  expect(result(a,b,'ETI')?.outcome).toBe('needs-evidence');
  expect(result(a,b,'IVACAFTOR')?.outcome).toBe('not-matched');
  expect(a.profile.entries.find(x=>x.therapy==='ETI')?.response).toBe('responsive');
 });
 it('preserves three rule-only therapies as unrecorded variant responses even for a matching pair',()=>{
  const a=v('51','F508del','II',null,'responsive','unknown','class_rule');
  const b=v('52','F508del','II',null,'responsive','unknown','class_rule');
  for(const id of ['IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR']){
   expect(a.profile.entries.find(x=>x.therapy===id)?.response).toBeNull();
  }
  expect(result(a,b,'LUMACAFTOR_IVACAFTOR')?.outcome).toBe('match');
 });
 it('keeps all five regimens present on a mismatched Class I pair',()=>{
  const a=v('61','E831X','I','exceptional','responsive','unknown');
  const b=v('62','G542X','I','exceptional','non_responsive','unknown');
  expect(compareLegacyFiveRegimens(a,b).map(x=>x.therapy)).toEqual([
   'ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'
  ]);
 });
});


describe('14H135 full original IVACAFTOR_VARIANTS and strict paired-regimen matrix',()=>{
 const originalIvaNames=[
  'G551D','G1244E','G1349D','G178R','G551S',
  'S1251N','S1255P','S549N','S549R','R117H','p.Arg117His',
  'E56K','P67L','R74W','D110H','R117C','L206W','R347H',
  'R352Q','A455E','S977F','F1052V','K1060T','A1067T',
  'G1069R','R1070Q','R1070W','F1074L','D1152H','G970R','D579G'
 ];
 it('retains all 31 original exact Kalydeco name/alias matches',()=>{
  expect(originalIvaNames).toHaveLength(31);
  for(const [i,name] of originalIvaNames.entries()){
   const a=v('101',name,'III',null,'unknown','unknown');
   const b=v('102','D110E','III',null,'unknown','unknown');
   const outcomes=compareLegacyFiveRegimens(a,b);
   expect(outcomes).toHaveLength(5);
   expect(outcomes.find(x=>x.therapy==='IVACAFTOR')?.outcome,name).toBe('match');
   expect(outcomes.find(x=>x.therapy==='LUMACAFTOR_IVACAFTOR')?.outcome,name).toBe('not-matched');
  }
 });
 it('keeps F508del + named Ivacaftor research rule distinct from strict Orkambi homozygote',()=>{
  for(const name of ['F508del','p.Phe508del','c.1521_1523del']){
   const a=v('201',name,'II',null,'unknown','unknown');
   const iva=v('202','G551D','III',null,'unknown','unknown');
   const both=v('203','F508del','II',null,'unknown','unknown');
   const mixed=compareLegacyFiveRegimens(a,iva);
   const homo=compareLegacyFiveRegimens(a,both);
   expect(mixed.find(x=>x.therapy==='TEZACAFTOR_IVACAFTOR')?.outcome).toBe('match');
   expect(mixed.find(x=>x.therapy==='LUMACAFTOR_IVACAFTOR')?.outcome).toBe('not-matched');
   expect(homo.find(x=>x.therapy==='LUMACAFTOR_IVACAFTOR')?.outcome).toBe('match');
  }
 });
 it('preserves direct tier and class-tier ETI matches without automatically applying them to unknown',()=>{
  const b=v('302','G542X','I','exceptional','unknown','unknown');
  for(const tier of ['clinical_trial','frt_assay','fda_approved']){
   const a=v('301','E831X','I','exceptional','responsive','unknown',tier);
   const rule=result(a,b,'ETI');
   expect(rule?.outcome).toBe('match');
   expect(rule?.basis).toBe('variant-tier');
  }
  const cls=v('303','unlisted Class II','II',null,'responsive','unknown','class_rule');
  expect(result(cls,b,'ETI')?.basis).toBe('legacy-class-rule');
  expect(result(v('304','unlisted Class II','II',null,'unknown','unknown','class_rule'),b,'ETI')?.outcome).toBe('needs-evidence');
 });
});
