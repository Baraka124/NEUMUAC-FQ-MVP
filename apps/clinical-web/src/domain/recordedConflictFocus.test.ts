import {describe,it,expect} from 'vitest';
import {recordedConflictFocus} from './recordedConflictFocus';
import type {ResearchHistory} from '../services/liveResearchHistory';
const history:ResearchHistory={validations:[],conflicts:[
 {id:10,variantId:'12',field:'source_record',severity:null,resolved:false,detectedAt:null,resolvedAt:null},
 {id:8,variantId:'12',field:'classification',severity:'HIGH',resolved:false,detectedAt:'2026-10-01T00:00:00Z',resolvedAt:null},
 {id:9,variantId:'12',field:'type',severity:'LOW',resolved:true,detectedAt:null,resolvedAt:null}
]};
describe('redacted research contradiction focus',()=>{
 it('shows recorded unresolved data only, ordered stably without inferring a reviewer decision',()=>{
  expect(recordedConflictFocus(history,'12')).toEqual({totalConflicts:3,resolvedCount:1,unresolved:[
   {id:10,field:'source_record',recordedSeverity:null},
   {id:8,field:'classification',recordedSeverity:'HIGH'}
  ]});
 });
 it('does not confuse successfully empty history with unavailable source',()=>{
  expect(recordedConflictFocus({validations:[],conflicts:[]},'12')).toEqual({totalConflicts:0,resolvedCount:0,unresolved:[]});
  expect(recordedConflictFocus(history,'13')).toBeNull();
 });
 it('refuses contradictory resolution chronology and duplicate identifiers',()=>{
  const invalid={...history,conflicts:[{...history.conflicts[0],resolvedAt:'2026-10-02T00:00:00Z'},...history.conflicts.slice(1)]};
  expect(recordedConflictFocus(invalid,'12')).toBeNull();
  expect(recordedConflictFocus({...history,conflicts:[history.conflicts[0],history.conflicts[0]]},'12')).toBeNull();
 });
});
