import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

const css=readFileSync(new URL('../clinical-editorial-integration.css',import.meta.url),'utf8');
const main=readFileSync(new URL('../main.ts',import.meta.url),'utf8');
describe('E03 full-system clinical editorial integration',()=>{
 it('loads after E01 tokens and E02 precision controls',()=>{
  const entry="import './clinical-editorial-integration.css';";
  expect(main.indexOf(entry)).toBeGreaterThan(main.indexOf("import './clinical-control-precision.css';"));
  expect(main.indexOf(entry)).toBeGreaterThan(main.indexOf("import './clinical-editorial-foundation.css';"));
 });
 it('covers actual dialog, help, evidence, audit and science worklist surfaces',()=>{
  for(const name of [
   '.workspace-launcher','.launcher-search','.launcher-options',
   '.nfq-context-help-panel','.variant-page .record-list',
   '.evidence-page .evidence-row','.nfq-audit-event',
   '.genotype-locus','.nfq-governance-page','.geo-observatory'
  ])expect(css).toContain(name);
 });
 it('preserves original theme controls and scientific classification boundaries',()=>{
  expect(css).toContain('.app-frame[data-nfq-theme="light"]');
  expect(css).toContain('.app-frame[data-nfq-theme="midnight"]');
  expect(css).not.toContain('data-response');
  expect(css).not.toContain('reported-response');
  expect(css).not.toContain('cftr_class');
  expect(css).not.toContain('localStorage');
 });
 it('keeps responsive, focus and reduced-motion protections',()=>{
  expect(css).toContain('@media(max-width:760px)');
  expect(css).toContain('@media(max-width:400px)');
  expect(css).toContain(':focus-visible');
  expect(css).toContain('@media(prefers-reduced-motion:reduce)');
 });
});
