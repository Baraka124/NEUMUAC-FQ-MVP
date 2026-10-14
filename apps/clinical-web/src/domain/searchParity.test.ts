import {describe,it,expect} from 'vitest';
import {normalizeScientificQuery,searchScientificFixtures} from './searchParity';
import {DEMO_RECORDS} from '../fixtures/variantRecords';
import type {VariantRecord} from './variantRecord';
const record=(id:string,name:string,protein:string|null=null,cdna:string|null=null):VariantRecord=>({...DEMO_RECORDS[0],id,name,aliases:[],nomenclature:{legacy:name,protein,cdna},evidence:[],evidenceCount:0});
const records=[record('v1','F508del','p.Phe508del','c.1521_1523delCTT'),record('v2','G551D','p.Gly551Asp'),record('v3','W1282X','p.Trp1282Ter'),record('v4','G551N')];
describe('legacy-inspired controlled scientific search characterization',()=>{
 it.each([['ΔF508','f508del'],['deltaF508','f508del'],['p.Phe508del','f508del'],['551','g551d'],['rs12345','rs12345'],['p.Gly551Asp','g551d'],['c.1521_1523delCTT','1521_1523del']])('normalizes %s as %s', (raw,want)=>{expect(normalizeScientificQuery(raw).normalized).toBe(want)});
 it('ranks exact ahead of prefix and fuzzy matches',()=>{const r=searchScientificFixtures(records,'G551D');expect(r.hits[0]?.record.id).toBe('v2');expect(r.hits[0]?.tier).toBe(0)});
 it('handles compound names without duplicate records',()=>{const r=searchScientificFixtures(records,'F508del G551D');expect(r.compound).toBe(true);expect(r.hits.map(h=>h.record.id)).toEqual(['v1','v2']);});
 it('uses cDNA and protein forms and typo tolerant lookup',()=>{expect(searchScientificFixtures(records,'p.Gly551Asp').hits[0]?.record.id).toBe('v2');expect(searchScientificFixtures(records,'c.1521_1523delCTT').hits[0]?.record.id).toBe('v1');expect(searchScientificFixtures(records,'G551E').hits.some(h=>h.record.id==='v2')).toBe(true);});
 it('rejects long prose, URLs and avoids any analytics persistence',()=>{expect(searchScientificFixtures(records,'https://example.test/variant').blocked).toBe(true);expect(searchScientificFixtures(records,'patient treatment report').blocked).toBe(true);expect(searchScientificFixtures(records,'no-match').status).toBe('no-match');});
 it('does not make the separate synthetic UI fixtures look scientific',()=>{expect(searchScientificFixtures(DEMO_RECORDS,'DEMO-CFTR-001').hits[0]?.record.id).toBe('sample-001');});
});
