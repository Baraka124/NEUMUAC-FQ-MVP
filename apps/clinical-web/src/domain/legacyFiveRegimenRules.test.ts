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
