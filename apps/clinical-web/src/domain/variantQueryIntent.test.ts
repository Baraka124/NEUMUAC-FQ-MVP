import {describe,it,expect} from 'vitest';
import {assessVariantQueryIntent,classifyResearchEvent} from './variantQueryIntent';
describe('Geographic research only considers variant-like, completed queries',()=>{
 it('rejects free text and technical noise',()=>{
  for(const input of ['hello','test','random text','clinician in galicia','patient F508del','https://example.com','john@example.com','F']){
   expect(classifyResearchEvent(input,'unmatched')).toBe('excluded');
  }
 });
 it('does not mistake ambiguous, unfinished or failing searches for scientific misses',()=>{
  for(const status of ['ambiguous','service-error','not-searched'] as const)
   expect(classifyResearchEvent('c.1521_1523delCTT',status)).toBe('excluded');
  expect(classifyResearchEvent('F508del','unmatched')).toBe('excluded'); // nomenclature needs human review
 });
 it('allows only a candidate for human-reviewed missing nomenclature, never novelty',()=>{
  expect(classifyResearchEvent('c.1521_1523del','unmatched')).toBe('miss-review-candidate');
  expect(classifyResearchEvent('G551D','matched')).toBe('hit-candidate');
 });
 it('does not treat lists as individual query events',()=>expect(classifyResearchEvent('G551D,F508del','unmatched')).toBe('excluded'));
});
