import {describe,it,expect} from 'vitest';
import {recordedResearchChronology} from './recordedResearchChronology';
import {recordedAuditCsv} from './recordedAuditExport';
import type {ResearchHistory} from '../services/liveResearchHistory';
import type {RealVariant} from '../services/liveVariants';
const variant:RealVariant={id:'18',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:null,aliases:[]};
const history:ResearchHistory={
 validations:[{id:2,variantId:'18',action:'REVIEWED',at:'2026-11-01T12:00:00Z',confidence:null,recordedClass:'IV'}],
 conflicts:[{id:3,variantId:'18',field:'recorded_class',severity:'HIGH',resolved:true,detectedAt:'2026-09-01T12:00:00Z',resolvedAt:null}]
};
describe('14H145 recorded audit export',()=>{
 it('exports only the exact recorded and undated events, with stable record links',()=>{
  const chronology=recordedResearchChronology(history,'18')!;
  const csv=recordedAuditCsv(variant,chronology);
  expect(csv).not.toBeNull();
  expect(csv).toContain('"18","R117H","v:2","validation","2026-11-01T12:00:00.000Z"');
  expect(csv).toContain('"c:3:detected","conflict-detected"');
  expect(csv).toContain('"c:3:resolved","conflict-resolved",""');
  expect(csv).toContain('"undated"');
  expect(csv).not.toMatch(/clinician|session_id|free.text/i);
 });
 it('normalizes timezone-bearing recorded dates to UTC without inferring missing dates',()=>{
  const updated:ResearchHistory={...history,validations:[{...history.validations[0],at:'2026-11-01T13:00:00+01:00'}]};
  const csv=recordedAuditCsv(variant,recordedResearchChronology(updated,'18')!);
  expect(csv).toContain('"2026-11-01T12:00:00.000Z"');
  expect(csv).not.toContain('2026-11-01T13:00:00+01:00');
 });
 it('preserves zero versus missing data: no events means no export',()=>{
  const chronology=recordedResearchChronology({validations:[],conflicts:[]},'18')!;
  expect(recordedAuditCsv(variant,chronology)).toBeNull();
 });
 it('escapes quotes and spreadsheet formulas from untrusted recorded metadata',()=>{
  const altered:ResearchHistory={validations:[
   {id:9,variantId:'18',action:'=HYPERLINK("evil")',at:null,confidence:'@SUM(1,1)',recordedClass:'II'}
  ],conflicts:[]};
  const csv=recordedAuditCsv({...variant,legacyName:'+CMD'},recordedResearchChronology(altered,'18')!);
  expect(csv).toContain('"\' +CMD"'.replace(' ',''));
  expect(csv).toContain('"\'=HYPERLINK(""evil"")"');
  expect(csv).not.toContain('\r\n=HYPERLINK');
 });
 it('rejects duplicate event keys, cross-variant references and invalid chronology counts',()=>{
  const chronology=recordedResearchChronology(history,'18')!;
  expect(recordedAuditCsv({...variant,id:'1=2'},chronology)).toBeNull();
  expect(recordedAuditCsv(variant,{...chronology,dated:[chronology.dated[0],chronology.dated[0]]})).toBeNull();
  expect(recordedAuditCsv(variant,{...chronology,conflictCount:999})).toBeNull();
 });
});
