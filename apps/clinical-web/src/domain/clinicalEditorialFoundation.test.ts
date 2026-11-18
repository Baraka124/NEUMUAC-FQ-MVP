import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const stylesheet=readFileSync(new URL('../clinical-editorial-foundation.css',import.meta.url),'utf8');
const entry=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
describe('E01 clinical editorial presentation foundation',()=>{
 it('loads after historic CSS layers without replacing the original app',()=>{
  expect(entry.indexOf("import './clinical-editorial-foundation.css';"))
   .toBeGreaterThan(entry.indexOf("import './editorial-research-system.css';"));
  expect(entry).toContain("import App from './App.vue'");
 });
 it('provides distinct light/midnight color variables and no theme persistence override',()=>{
  expect(stylesheet).toContain('.app-frame[data-nfq-theme="light"]');
  expect(stylesheet).toContain('.app-frame[data-nfq-theme="midnight"]');
  expect(stylesheet).toContain('--nfq-ui-focus:#245bb0');
  expect(stylesheet).toContain('--nfq-ui-focus:#9abcf4');
  expect(stylesheet).not.toContain('localStorage');
 });
 it('keeps keyboard and reduced-motion accessibility',()=>{
  expect(stylesheet).toContain(':focus-visible');
  expect(stylesheet).toContain('@media(prefers-reduced-motion:reduce)');
  expect(stylesheet).toContain('@media(max-width:760px)');
 });
 it('does not style scientific interpretation markers or invent response statuses',()=>{
  expect(stylesheet).not.toMatch(/data-response\s*=/);
  expect(stylesheet).not.toContain('reported-response');
  expect(stylesheet).not.toContain('eti_prediction');
  expect(stylesheet).not.toContain('cftr_class');
 });
});
