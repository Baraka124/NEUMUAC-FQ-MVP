import {it,expect} from 'vitest';
import {recordedNomenclature,unspecifiedSourceLinks} from './documentationTrace';
import type {CoverageRow} from '../services/liveCoverage';
const row:CoverageRow={variant:{id:'3',legacyName:'1001+11C/T',cdnaName:'c.869+11C>T',proteinName:null,aliases:[]},links:3,sources:[{name:'PubMed',count:2},{name:null,count:1}]};
it('preserves literal recorded nomenclature and distinguishes missing fields',()=>{
 expect(recordedNomenclature(row.variant).map(x=>x.value)).toEqual(['1001+11C/T',null,'c.869+11C>T',null]);
 expect(unspecifiedSourceLinks(row)).toBe(1);
 expect(()=>unspecifiedSourceLinks({...row,links:4})).toThrow();
});
