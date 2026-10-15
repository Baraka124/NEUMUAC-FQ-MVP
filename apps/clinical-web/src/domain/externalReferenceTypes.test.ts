import {describe,it,expect} from 'vitest';
import {classifyExternalReferenceUrl,cftr2LinkedReferences} from './externalReferenceTypes';
describe('Phase 4C external references',()=>{
 it('recognizes only exact CFTR2 hosts',()=>{
  expect(classifyExternalReferenceUrl('https://cftr2.org/variant/1001').kind).toBe('CFTR2');
  expect(classifyExternalReferenceUrl('https://cftr2.org.evil.example/variant/1001').kind).toBe('Other');
  expect(classifyExternalReferenceUrl('http://cftr2.org/variant/1001').kind).toBe('Other');
 });
 it('does not promote a link into a verified scientific conclusion',()=>{
  const ref=classifyExternalReferenceUrl('https://cftr2.org/variant/1001');
  expect(ref.verification).toBe('linked-only');
  expect(ref.explanation).toMatch(/not been verified/);
 });
 it('filters only explicit links, with no URL synthesis',()=>{
  const links=[{url:'https://cftr2.org/mutation/scientific/x',id:1},{url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',id:2}];
  expect(cftr2LinkedReferences(links).map(x=>x.id)).toEqual([1]);
 });
});