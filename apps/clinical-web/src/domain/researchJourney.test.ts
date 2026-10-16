import {describe,it,expect} from 'vitest';
import {variantJourneyPath,workspaceJourneyPath,safeResearchReturnPath} from './researchJourney';
describe('research continuity uses only bounded internal routes',()=>{
 it('preserves variant identity and allowed worklist state',()=>{
  const value=variantJourneyPath('123',{q:'1001+11C/T',class:'II',sort:'name-desc',page:'2'});
  expect(value).toBe('/variants/123?q=1001%2B11C%2FT&class=II&sort=name-desc&page=2');
  expect(safeResearchReturnPath(value,'variant')).toBe(value);
 });
 it('restores legal evidence and intelligence views only',()=>{
  expect(safeResearchReturnPath(workspaceJourneyPath('/evidence',{q:'PubMed',page:'1'}),'workspace')).toContain('/evidence');
  expect(safeResearchReturnPath(workspaceJourneyPath('/intelligence',{group:'multiple',shown:'80',expanded:'12'}),'workspace')).toContain('/intelligence');
 });
 it('rejects external, unexpected, ambiguous and nested untrusted URLs',()=>{
  for(const value of ['https://evil.example/variants/1','//evil.example','/admin','/variants/a','/variants/2?from=%2Fadmin','/variants/1?q=abc&q=def','/variants/2#x','/variants/2?page=-1','/variants/2?q='+('a'.repeat(900))])
   expect(safeResearchReturnPath(value,'variant')).toBeNull();
  expect(safeResearchReturnPath('/variants/1','workspace')).toBeNull();
  expect(safeResearchReturnPath('/evidence','variant')).toBeNull();
 });
});
it('preserves only validated variant-scoped evidence and coverage routes',()=>{
 const evidence=workspaceJourneyPath('/evidence',{variant:'383',page:'0'});
 const coverage=workspaceJourneyPath('/intelligence',{variant:'383',group:'none',shown:'40'});
 expect(safeResearchReturnPath(evidence,'workspace')).toBe(evidence);
 expect(safeResearchReturnPath(coverage,'workspace')).toBe(coverage);
 expect(workspaceJourneyPath('/evidence',{variant:'../admin'})).toBeNull();
 expect(safeResearchReturnPath('/intelligence?variant=https%3A%2F%2Fother.example','workspace')).toBeNull();
});
