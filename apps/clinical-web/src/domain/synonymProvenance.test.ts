import {describe,it,expect} from 'vitest';
import {assessSynonymProvenance} from './synonymProvenance';
import type {RealVariant} from '../services/liveVariants';
const record=(id:string,name:string,aliases:readonly string[]=[]):RealVariant=>({id,legacyName:name,proteinName:null,cdnaName:null,aliases});
describe('synonym provenance classifier',()=>{
 it('distinguishes exact recorded aliases from historical hints',()=>{
  expect(assessSynonymProvenance('DF508',[record('12','F508del',['DF508'])])).toMatchObject({kind:'recorded-match',recordId:'12',recordedValue:'DF508'});
  expect(assessSynonymProvenance('508',[record('12','F508del')])).toMatchObject({kind:'historical-lead',suggestedName:'F508del',candidates:['12'],scope:'visible-page-only'});
 });
 it('does not claim unique identity for duplicated recorded aliases',()=>{
  expect(assessSynonymProvenance('DF508',[record('12','F508del',['DF508']),record('13','other',['DF508'])])).toMatchObject({kind:'ambiguous-recorded',recordIds:['12','13']});
 });
 it('does not manufacture coverage or molecular equivalence',()=>{
  expect(assessSynonymProvenance('508',[])).toMatchObject({kind:'historical-lead',candidates:[]});
  expect(assessSynonymProvenance('unknown',[])).toEqual({kind:'no-evidence'});
 });
});