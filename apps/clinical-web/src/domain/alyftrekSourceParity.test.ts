import {describe,it,expect} from 'vitest';
import {assessAlyftrekSourceParity} from './alyftrekSourceParity';
import type {SourceSpecificResponse} from '../services/sourceSpecificResponse';
const base:SourceSpecificResponse={id:'11',variantId:'35',sourceId:'2',eti:'non_responsive',alyftrek:'responsive',
 confidence:null,sampleSize:null,recordedAt:null,
 source:{id:'2',key:'paper',name:'Test scientific reference',type:'research_paper',year:2025,url:null,active:true}};
describe('14H25 Alyftrek source-specific consistency',()=>{
 it('preserves Class I ETI-negative / Alyftrek-responsive independent classification',()=>{
  const result=assessAlyftrekSourceParity('35','responsive',[base]);
  expect(result.state).toBe('aligned-recorded-fields');
  expect(result.relevantSourceCount).toBe(1);
  expect(result.conflictingSourceIds).toEqual([]);
 });
 it('does not count ETI-only papers as Alyftrek evidence',()=>{
  const r=assessAlyftrekSourceParity('35','responsive',[{...base,alyftrek:null}]);
  expect(r.state).toBe('incomplete');
  expect(r.relevantSourceCount).toBe(0);
 });
 it('detects source disagreements without changing any response fields',()=>{
  const rows=[{...base,id:'12',alyftrek:'non_responsive' as const},base];
  const snapshot=JSON.stringify(rows);
  const r=assessAlyftrekSourceParity('35','responsive',rows);
  expect(r.state).toBe('requires-review');
  expect(r.conflictingSourceIds).toEqual(['12','11']);
  expect(r.findings).toHaveLength(2);
  expect(JSON.stringify(rows)).toBe(snapshot);
 });
 it('does not infer nonresponse from an unknown or absent source finding',()=>{
  expect(assessAlyftrekSourceParity('35','unknown',[]).state).toBe('incomplete');
  expect(assessAlyftrekSourceParity('35',null,[{...base,alyftrek:'inconclusive'}]).state).toBe('incomplete');
 });
 it('rejects cross-variant source reuse',()=>{
  expect(()=>assessAlyftrekSourceParity('35','responsive',[{...base,variantId:'19'}])).toThrow();
 });
});
