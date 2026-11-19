import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const e01=readFileSync(new URL('../clinical-editorial-foundation.css',import.meta.url),'utf8');
const e02=readFileSync(new URL('../clinical-control-precision.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
describe('E02 clinical precision controls',()=>{
 it('preserves the original institutional sidebar and canvas after the E01 correction',()=>{
  expect(e01).toContain('--ed-side:#0c1422;');
  expect(e01).toContain('--ed-canvas:#f4f5f7;');
  expect(e01).toContain('background:#0c1422!important');
  expect(e01).toContain('background:#f4f5f7!important');
 });
 it('loads after E01 and avoids mutations to domain/therapy code',()=>{
  expect(main.indexOf("import './clinical-control-precision.css';"))
   .toBeGreaterThan(main.indexOf("import './clinical-editorial-foundation.css';"));
  expect(e02).toContain('.variant-filter-trigger');
  expect(e02).toContain('.launcher-options button');
  expect(e02).toContain('.nfq-coverage-search input');
  expect(e02).toContain('.nfq-audit-search-row input');
 });
 it('preserves transparent utility filters and stable hit targets',()=>{
  expect(e02).toContain('background:transparent!important');
  expect(e02).toContain('min-height:40px;');
  expect(e02).toContain('max-height:44px;');
 });
 it('supports keyboard focus and reduced motion',()=>{
  expect(e02).toContain(':focus-visible');
  expect(e02).toContain('@media(prefers-reduced-motion:reduce)');
  expect(e02).toContain('@media(max-width:760px)');
 });
 it('never styles genotype findings or clinical therapy state indicators',()=>{
  expect(e02).not.toMatch(/data-response\s*=/);
  expect(e02).not.toContain('reported-response');
  expect(e02).not.toContain('genotype_class');
 });
});
