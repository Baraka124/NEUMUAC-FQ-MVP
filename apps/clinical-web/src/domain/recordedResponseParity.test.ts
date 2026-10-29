import {describe,it,expect} from 'vitest';
import {assessRecordedResponseParity} from './recordedResponseParity';
import type {LegacyEtiRecord} from '../services/legacyEtiResponse';
import type {SourceSpecificResponse} from '../services/sourceSpecificResponse';
const original:LegacyEtiRecord={
 id:'14',recordedEtiCategory:'responsive',legacyTherapyFlag:false,
 recordedEvidenceLevel:'clinical_trial',recordedEvidenceTier:null,
 recordedAuthority:null,recordedCftr2Response:null,lastEvidenceUpdate:null
};
const source:SourceSpecificResponse={
 id:'14',variantId:'14',sourceId:'2',eti:'non_responsive',alyftrek:null,
 confidence:null,sampleSize:null,recordedAt:null,
 source:{id:'2',key:'paper',name:'Recorded paper',type:'research_paper',year:2025,url:null,active:true}
};
const review=(x:LegacyEtiRecord=original,y:readonly SourceSpecificResponse[]=[source])=>
 assessRecordedResponseParity(x,y);
describe('14H4 original-to-v2 parity scenarios',()=>{
 it('flags original variant-vs-boolean and source-level mismatches independently',()=>{
  const result=review();
  expect(result.state).toBe('requires-review');
  expect(result.signals.map(s=>s.kind)).toContain('category-flag-disagreement');
  expect(result.signals.map(s=>s.kind)).toContain('category-source-disagreement');
  expect(result.signals.find(x=>x.kind==='category-source-disagreement')?.evidenceIds).toEqual(['14']);
  expect(result.etiRecords).toBe(1);
 });
 it('preserves a legacy nonresponsive category with a true flag as a recorded mismatch',()=>{
  const result=review({...original,recordedEtiCategory:'non_responsive',legacyTherapyFlag:true});
  expect(result.signals.map(x=>x.kind)).toContain('category-flag-disagreement');
 });
 it('does not treat unknown with a false flag as proven nonresponse',()=>{
  const result=review({...original,recordedEtiCategory:'unknown',legacyTherapyFlag:false},[]);
  expect(result.state).toBe('incomplete');
  expect(result.signals.map(x=>x.kind)).toEqual(['category-unknown','no-source-records']);
 });
 it('reports source rows without ETI findings as missing, not responsive or negative',()=>{
  const x=review({...original,recordedEtiCategory:'responsive',legacyTherapyFlag:true},
   [{...source,eti:null}]);
  expect(x.state).toBe('incomplete');
  expect(x.signals.map(y=>y.kind)).toContain('no-source-eti-finding');
  expect(x.etiRecords).toBe(0);
 });
 it('detects source-to-source disagreement and retains both original source IDs',()=>{
  const x=review({...original,legacyTherapyFlag:true},[
   {...source,id:'10',eti:'responsive'},
   {...source,id:'11',eti:'non_responsive'}
  ]);
  expect(x.signals.find(s=>s.kind==='source-source-disagreement')?.evidenceIds).toEqual(['10','11']);
  expect(x.sourceRecords).toBe(2);
 });
 it('does not claim source-verified efficacy when all literal categories align',()=>{
  const x=review({...original,legacyTherapyFlag:true},[{...source,eti:'responsive'}]);
  expect(x.signals).toEqual([]);
  expect(x.state).toBe('aligned-recorded-fields');
 });
 it('rejects cross-variant comparisons and cannot create false alignment',()=>{
  expect(()=>review(original,[{...source,variantId:'15'}])).toThrow(/unrelated/);
 });
});
