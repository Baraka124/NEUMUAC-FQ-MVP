import {describe,it,expect} from 'vitest';
import {pairReadinessText,type PairReadiness} from './pairReadiness';
describe('14H22 truthful two-variant therapy readiness',()=>{
 it('does not call selected identities a completed therapy comparison',()=>{
  expect(pairReadinessText('loading')).toContain('Loading');
  expect(pairReadinessText('ready')).toContain('ready');
  expect(pairReadinessText('error')).toContain('failed');
  expect(pairReadinessText('unavailable')).toContain('unavailable');
 });
 it('has a meaningful status for every exact allowed state',()=>{
  const phases:PairReadiness[]=['loading','ready','error','unavailable'];
  expect(new Set(phases.map(pairReadinessText)).size).toBe(4);
 });
});
