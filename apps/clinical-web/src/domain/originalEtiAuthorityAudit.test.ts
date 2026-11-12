import {describe,it,expect} from 'vitest';
import {projectVariantTherapies,type RecordedResponse} from './therapyRegistry';
import type {NamedVariant} from './legacyFiveRegimenRules';
import {
 ORIGINAL_ETI_LISTED_ALIASES,ORIGINAL_ETI_NONRESPONSE_ALIASES,
 originalEtiListFinding
} from './originalEtiAuthorityAudit';

function variant(id:string,names:(string|null)[],eti:RecordedResponse):NamedVariant{
 return {id,names,profile:projectVariantTherapies({
  id,functionalClass:'I',classSubtype:'exceptional',validationCount:0,
  eti,alyftrek:'responsive',etiEvidenceLevel:null,alyftrekEvidenceLevel:null,
  etiEvidenceTier:'frt_assay',alyftrekEvidenceTier:'clinical_trial',
  etiAuthority:'independent ETI record',alyftrekAuthority:'independent Alyftrek record'
 })};
}
describe('14H134 original ETI authority list reconciled as historical evidence only',()=>{
 it('retains exactly 59 originally positive and 15 originally negative aliases',()=>{
  expect(ORIGINAL_ETI_LISTED_ALIASES).toHaveLength(59);
  expect(ORIGINAL_ETI_NONRESPONSE_ALIASES).toHaveLength(15);
  expect(new Set(ORIGINAL_ETI_LISTED_ALIASES)).toHaveProperty('size',59);
  expect(new Set(ORIGINAL_ETI_NONRESPONSE_ALIASES)).toHaveProperty('size',15);
 });
 it('finds original aliases including R117H, F508del and splicing notation without inferring a response',()=>{
  for(const name of ['r117h','p.Phe508del','3120+1G→A','p.Asn1303Lys']){
   const record=variant('12',[name],'non_responsive');
   const before=JSON.stringify(record);
   const finding=originalEtiListFinding(record);
   expect(finding.state).toBe('listed-positive');
   expect(finding.discrepancy).toBe(true);
   expect(finding.recordedResponse).toBe('non_responsive');
   expect(JSON.stringify(record)).toBe(before);
  }
 });
 it('does not change exceptional Class I recorded positive for legacy-listed negative alias',()=>{
  const v=variant('19',['G542X','p.Gly542Ter'],'responsive');
  const finding=originalEtiListFinding(v);
  expect(finding.state).toBe('listed-negative');
  expect(finding.discrepancy).toBe(true);
  expect(v.profile.entries[0].response).toBe('responsive');
  expect(v.profile.entries[1].response).toBe('responsive');
 });
 it('preserves unlisted exceptional responders without inventing old label support',()=>{
  const finding=originalEtiListFinding(variant('1',['E831X'],'responsive'));
  expect(finding.state).toBe('not-listed');
  expect(finding.discrepancy).toBe(false);
  expect(finding.recordedResponse).toBe('responsive');
 });
 it('detects conflicting historical names, never silently selects one',()=>{
  const finding=originalEtiListFinding(variant('5',['G551D','G542X'],'unknown'));
  expect(finding.state).toBe('conflicting-aliases');
  expect(finding.discrepancy).toBe(true);
  expect(finding.positiveAliases).toEqual(['G551D']);
  expect(finding.negativeAliases).toEqual(['G542X']);
  expect(Object.isFrozen(finding)).toBe(true);
  expect(Object.isFrozen(finding.positiveAliases)).toBe(true);
 });
 it('matches exact aliases only and treats non-recording as absence of old-list match',()=>{
  const finding=originalEtiListFinding(variant('7',['G551DX','not G551D',null],'unknown'));
  expect(finding.state).toBe('not-listed');
  expect(finding.discrepancy).toBe(false);
 });
});
