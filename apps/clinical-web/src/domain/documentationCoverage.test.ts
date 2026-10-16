import {describe,it,expect} from 'vitest';
import {filterDocumentation,summarizeDocumentation} from './documentationCoverage';
import type {CoverageRow} from '../services/liveCoverage';
const rows:CoverageRow[]=[
 {variant:{id:'1',legacyName:'1001+11C/T',proteinName:'p.?',cdnaName:'c.869+11C>T',aliases:[]},links:0,sources:[]},
 {variant:{id:'2',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:'c.350G>A',aliases:['Alias-R117H']},links:1,sources:[{name:'Recorded source',count:1}]},
 {variant:{id:'3',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:[]},links:3,sources:[{name:'Recorded source',count:3}]},
 {variant:{id:'4',legacyName:'G551D',proteinName:null,cdnaName:null,aliases:[]},links:0,sources:[]}
];
describe('research documentation coverage is non-clinical and source-bound',()=>{
 it('uses the exact recorded reference counts, not inferred scores',()=>{
  expect(summarizeDocumentation(rows)).toEqual({none:2,single:1,multiple:1,all:4});
  expect(filterDocumentation(rows,'none','').map(x=>x.variant.id)).toEqual(['1','4']);
  expect(filterDocumentation(rows,'single','').map(x=>x.variant.id)).toEqual(['2']);
  expect(filterDocumentation(rows,'multiple','').map(x=>x.variant.id)).toEqual(['3']);
 });
 it('searches recorded nomenclature and aliases literally, case-insensitively',()=>{
  expect(filterDocumentation(rows,'all','1001+11c/t').map(x=>x.variant.id)).toEqual(['1']);
  expect(filterDocumentation(rows,'all','c.869+11C>T').map(x=>x.variant.id)).toEqual(['1']);
  expect(filterDocumentation(rows,'all','alias-r117h').map(x=>x.variant.id)).toEqual(['2']);
  expect(filterDocumentation(rows,'all','c.869+11C/A')).toEqual([]);
 });
 it('does not silently accept malformed or invented link counts',()=>{
  expect(()=>summarizeDocumentation([{...rows[0],links:-1}])).toThrow();
  expect(()=>summarizeDocumentation([{...rows[0],links:1.5}])).toThrow();
 });
});