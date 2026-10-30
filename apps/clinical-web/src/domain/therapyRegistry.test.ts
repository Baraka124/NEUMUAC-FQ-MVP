import {describe,expect,it} from 'vitest';
import {THERAPIES,resolveTherapyName,getTherapy,projectVariantTherapies} from './therapyRegistry';

const record={
 id:'1',functionalClass:'I',classSubtype:'exceptional',validationCount:0,
 eti:'responsive' as const,alyftrek:'unknown' as const,
 etiEvidenceLevel:'real_world',alyftrekEvidenceLevel:null,
 etiEvidenceTier:null,alyftrekEvidenceTier:'class_rule',
 etiAuthority:null,alyftrekAuthority:'original-register-source'
};
describe('14H11 five-drug catalog and safe data projection',()=>{
 it('contains precisely the five unique original calculator regimens',()=>{
  expect(THERAPIES.map(x=>x.id)).toEqual([
   'ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'
  ]);
  expect(new Set(THERAPIES.map(x=>x.id)).size).toBe(5);
  expect(THERAPIES.filter(x=>x.responseField!==null).map(x=>x.id)).toEqual(['ETI','ALYFTREK']);
  expect(THERAPIES.filter(x=>x.originalEuRule).length).toBe(4);
 });
 it('does not double-count regional drug brands',()=>{
  expect(resolveTherapyName('Kaftrio')).toBe('ETI');
  expect(resolveTherapyName('TRIKAFTA')).toBe('ETI');
  expect(resolveTherapyName('Symkevi')).toBe('TEZACAFTOR_IVACAFTOR');
  expect(resolveTherapyName('Symdeko')).toBe('TEZACAFTOR_IVACAFTOR');
  expect(resolveTherapyName('Orkambi')).toBe('LUMACAFTOR_IVACAFTOR');
  expect(resolveTherapyName('Kalydeco')).toBe('IVACAFTOR');
  expect(resolveTherapyName('Alyftrek')).toBe('ALYFTREK');
  expect(resolveTherapyName('unrecognized-medication')).toBeNull();
  expect(resolveTherapyName({})).toBeNull();
  expect(getTherapy('LUMACAFTOR_IVACAFTOR').originalEuRule).toBe(false);
 });
 it('never infers response for the other three drugs from ETI or from functional class',()=>{
  const x=projectVariantTherapies(record);
  expect(x.entries).toHaveLength(5);
  expect(x.entries[0].response).toBe('responsive');
  expect(x.entries[1].response).toBe('unknown');
  for(const entry of x.entries.slice(2)){
   expect(entry.coverage).toBe('genotype-rule-only');
   expect(entry.response).toBeNull();
   expect(entry.evidenceTier).toBeNull();
  }
 });
 it('preserves exceptional Class I + ETI non-responsive and alternative drug responses',()=>{
  const x=projectVariantTherapies({...record,eti:'non_responsive',alyftrek:'responsive'});
  expect(x.functionalClass).toBe('I');
  expect(x.classSubtype).toBe('exceptional');
  expect(x.entries[0].response).toBe('non_responsive');
  expect(x.entries[1].response).toBe('responsive');
  expect(x.validationCount).toBe(0);
 });
 it('preserves true Class I with Alyftrek response and ETI nonresponse without rewriting',()=>{
  const x=projectVariantTherapies({...record,classSubtype:'true',eti:'non_responsive',alyftrek:'responsive'});
  expect(x.entries.map(e=>e.response).slice(0,2)).toEqual(['non_responsive','responsive']);
  expect(Object.isFrozen(x.entries)).toBe(true);
  expect(Object.isFrozen(x.entries[0])).toBe(true);
 });
});
