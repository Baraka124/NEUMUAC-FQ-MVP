import {describe,it,expect} from 'vitest';
import {recordedResearchChronology} from './recordedResearchChronology';
import type {ResearchHistory} from '../services/liveResearchHistory';
const valid:ResearchHistory={
 validations:[
  {id:3,variantId:'18',action:'VALIDATED',at:'2026-10-01T10:00:00Z',confidence:'Recorded',recordedClass:'II'},
  {id:5,variantId:'18',action:'REVIEWED',at:null,confidence:null,recordedClass:null}
 ],
 conflicts:[
  {id:6,variantId:'18',field:'functional_class',severity:'HIGH',resolved:true,detectedAt:'2026-09-01T12:00:00+02:00',resolvedAt:'2026-10-04T13:00:00Z'},
  {id:9,variantId:'18',field:'citation_source',severity:null,resolved:false,detectedAt:null,resolvedAt:null}
 ]
};
describe('nonclinical recorded chronology',()=>{
 it('sorts real dated actions newest first, keeps undated actions separate',()=>{
  const chronology=recordedResearchChronology(valid,'18');
  expect(chronology).not.toBeNull();
  expect(chronology?.dated.map(e=>e.key)).toEqual(['c:6:resolved','v:3','c:6:detected']);
  expect(chronology?.undated.map(e=>e.key)).toEqual(['c:9:detected','v:5']);
  expect(chronology?.dated[2].timestampLabel).toBe('2026-09-01 10:00 UTC');
  expect(chronology?.validationCount).toBe(2);
  expect(chronology?.conflictCount).toBe(2);
 });
 it('does not invent a resolution date when the current record says resolved without one',()=>{
  const chronology=recordedResearchChronology({validations:[],conflicts:[{...valid.conflicts[0],resolvedAt:null}]},'18');
  expect(chronology?.dated.map(e=>e.key)).toEqual(['c:6:detected']);
  expect(chronology?.undated.map(e=>e.key)).toEqual(['c:6:resolved']);
  expect(chronology?.undated[0].timestampLabel).toBe('Date not recorded');
 });
 it('rejects invalid or inconsistent source information rather than showing a fake audit order',()=>{
  expect(recordedResearchChronology(valid,'19')).toBeNull();
  expect(recordedResearchChronology({...valid,validations:[valid.validations[0],valid.validations[0]]},'18')).toBeNull();
  expect(recordedResearchChronology({...valid,conflicts:[{...valid.conflicts[0],resolvedAt:'2026-08-01T00:00:00Z'}]},'18')).toBeNull();
  expect(recordedResearchChronology({...valid,validations:[{...valid.validations[0],at:'yesterday'}]},'18')).toBeNull();
  expect(recordedResearchChronology({...valid,validations:[{...valid.validations[0],at:'2026-10-01T10:00:00'}]},'18')).toBeNull();
  expect(recordedResearchChronology({...valid,conflicts:[{...valid.conflicts[0],resolved:false}]},'18')).toBeNull();
  expect(recordedResearchChronology({...valid,conflicts:[{...valid.conflicts[0],id:0}]},'18')).toBeNull();
 });
 it('renders an empty successful history as empty, never as denied access',()=>{
  expect(recordedResearchChronology({validations:[],conflicts:[]},'18')).toEqual({
   dated:[],undated:[],validationCount:0,conflictCount:0
  });
 });
});
