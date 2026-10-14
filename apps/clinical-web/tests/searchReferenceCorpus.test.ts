import {expect,it} from 'vitest';
import {REFERENCE_RECORDS,SEARCH_REFERENCE_CASES} from './searchReferenceCorpus';
import {runLegacyOracle} from './legacySearchOracle';
import {searchScientificFixtures} from '../src/domain/searchParity';
import {auditDifferences,differencesFor} from './differentialPolicy';

it('maintains 52 distinct synthetic differential queries with scientific-format categories',()=>{
 expect(SEARCH_REFERENCE_CASES).toHaveLength(52);
 expect(new Set(SEARCH_REFERENCE_CASES.map(x=>x.query)).size).toBe(52);
 expect(new Set(SEARCH_REFERENCE_CASES.map(x=>x.category))).toEqual(new Set([
  'existing-baseline','exact-and-case','hgvs-and-protein','splice-and-legacy',
  'alias-and-numeric','compound','ambiguous-and-invalid'
 ]));
 expect(REFERENCE_RECORDS).toHaveLength(12);
 expect(REFERENCE_RECORDS.every(x=>x.recordSource.origin==='synthetic-fixture')).toBe(true);
});

it('registers all observed differences without silently deciding their clinical correctness',()=>{
 const rows=SEARCH_REFERENCE_CASES.map(({query})=>{
  const old=runLegacyOracle(REFERENCE_RECORDS,query);
  const modern=searchScientificFixtures(REFERENCE_RECORDS,query);
  const current={ids:modern.hits.map(x=>x.record.id),normalized:modern.normalized,blocked:modern.blocked};
  const legacy={ids:old.ids,normalized:old.normalized,blocked:old.blocked};
  return {query,legacy,modern:current,differences:differencesFor(legacy,current)};
 });
 const policy=auditDifferences(rows);
 expect(policy.unexpected).toEqual([]);
 expect(policy.missing).toEqual([]);
 expect(rows.filter(x=>x.differences.length).map(x=>x.query).sort()).toEqual([
  'patient treatment report','ΔF508','δF508'
 ].sort());
});
