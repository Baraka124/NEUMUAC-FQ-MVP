import {expect,it} from 'vitest';
import type {CoverageRow} from '../services/liveCoverage';
import {documentationWorklistCsv,MAX_DOCUMENTATION_EXPORT_ROWS} from './documentationWorklistExport';
const first:CoverageRow={variant:{id:'17',legacyName:'F508del',proteinName:'p.Phe508del',cdnaName:'c.1521_1523delCTT',aliases:[]},
 links:3,sources:[{name:'PubMed',count:2},{name:null,count:1}]};
const second:CoverageRow={variant:{id:'19',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:'c.350G>A',aliases:[]},links:0,sources:[]};
it('exports all supplied matched records and exact source-name absence, never evidence priority',()=>{
 const csv=documentationWorklistCsv([first,second]);
 if(csv===null)throw Error('Expected a valid research worklist');
 expect(csv).toContain('"17","F508del","p.Phe508del","c.1521_1523delCTT","3","1"');
 expect(csv).toContain('"19","R117H","p.Arg117His","c.350G>A","0","0"');
 expect(csv).not.toContain('priority');
 expect(csv).not.toContain('quality');
 expect(csv.split('\r\n').length).toBe(4);
});
it('neutralizes spreadsheet formulas in recorded nomenclature fields',()=>{
 const csv=documentationWorklistCsv([{...first,variant:{...first.variant,legacyName:'=SUM(1)',proteinName:'@HYPERLINK(1)',cdnaName:'-3+5'}}]);
 expect(csv).toContain('"\'=SUM(1)"');
 expect(csv).toContain('"\'@HYPERLINK(1)"');
 expect(csv).toContain('"\'-3+5"');
});
it('fails closed on invalid IDs, duplicate records, incomplete source summaries and oversized worklists',()=>{
 expect(documentationWorklistCsv([])).toBeNull();
 expect(documentationWorklistCsv([first,first])).toBeNull();
 expect(documentationWorklistCsv([{...first,variant:{...first.variant,id:'00'}}])).toBeNull();
 expect(documentationWorklistCsv([{...first,links:4}])).toBeNull();
 expect(documentationWorklistCsv([{...first,links:-1}])).toBeNull();
 expect(documentationWorklistCsv(Array.from({length:MAX_DOCUMENTATION_EXPORT_ROWS+1},(_,i)=>({
  ...first,variant:{...first.variant,id:String(i+1)}})))).toBeNull();
});
