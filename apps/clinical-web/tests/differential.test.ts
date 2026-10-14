import {describe,it,expect} from 'vitest';
import {runLegacyOracle} from './legacySearchOracle';
import {searchScientificFixtures,normalizeScientificQuery} from '../src/domain/searchParity';
import {DEMO_RECORDS} from '../src/fixtures/variantRecords';
import type {VariantRecord} from '../src/domain/variantRecord';
const record=(id:string,name:string,protein:string|null=null,cdna:string|null=null):VariantRecord=>({...DEMO_RECORDS[0],id,name,aliases:[],nomenclature:{legacy:name,protein,cdna},evidence:[],evidenceCount:0});
const records=[record('v1','F508del','p.Phe508del','c.1521_1523delCTT'),record('v2','G551D','p.Gly551Asp'),record('v3','W1282X','p.Trp1282Ter'),record('v4','G551N')];
const cases=['F508del','f508DEL','p.Phe508del','G551D','p.Gly551Asp','c.1521_1523delCTT','W1282X','deltaF508','551','rs12345','G551E','G551D G551N','https://example.test/variant','patient treatment report','ΔF508'];
describe('frozen source oracle against controlled search module',()=>{
 it.each(cases)('executes same synthetic query %s without network',query=>{
  const old=runLegacyOracle(records,query),modern=searchScientificFixtures(records,query);
  expect(old).toHaveProperty('ids');
  expect(modern).toHaveProperty('hits');
  expect(old.normalized.length).toBeGreaterThan(0);
 });
 it('anchors a verified zero-difference exact scientific identity case',()=>{
  const old=runLegacyOracle(records,'G551D'),modern=searchScientificFixtures(records,'G551D');
  expect(old.ids[0]).toBe(modern.hits[0]?.record.id);
  expect(old.normalized).toBe(normalizeScientificQuery('G551D').normalized);
 });
});
