import {describe,it,expect} from 'vitest';
import {explainTextMatch,rankVisibleSearchPage} from './searchPresentation';
import type {RealVariant} from '../services/liveVariants';
const make=(id:string,legacyName:string,proteinName:string|null=null,cdnaName:string|null=null,aliases:readonly string[]=[]):RealVariant=>({id,legacyName,proteinName,cdnaName,aliases});
describe('explainable scientific text matching',()=>{
 it('prioritizes exact recorded identity over a substring and explains which field matched',()=>{
  const partial=make('1','pre-F508del-copy');
  const exact=make('2','F508del');
  const alias=make('3','Variant-Z',null,null,['F508del']);
  expect(rankVisibleSearchPage([partial,alias,exact],'F508del').map(v=>v.id)).toEqual(['2','3','1']);
  expect(explainTextMatch(exact,'f508DEL')?.label).toBe('Exact · Recorded name');
  expect(explainTextMatch(alias,'F508del')?.label).toBe('Exact · Recorded alias');
 });
 it('explains HGVS notation without pretending to scientifically normalize distinct variants',()=>{
  const r=make('18','F508del','p.Phe508del','c.1521_1523delCTT',['DF508']);
  expect(explainTextMatch(r,'p.Phe508del')?.label).toBe('Exact · Protein notation');
  expect(explainTextMatch(r,'c.1521_1523delCTT')?.label).toBe('Exact · cDNA notation');
  expect(explainTextMatch(r,'508del')?.label).toContain('Contains');
  expect(explainTextMatch(r,'G551D')).toBeNull();
 });
 it('keeps stable server order for equal rank and empty search',()=>{
  const rows=[make('1','X100A'),make('2','X200A')];
  expect(rankVisibleSearchPage(rows,'X').map(x=>x.id)).toEqual(['1','2']);
  expect(rankVisibleSearchPage(rows,'')).toBe(rows);
 });
});
