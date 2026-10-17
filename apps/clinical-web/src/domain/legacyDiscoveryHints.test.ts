import {describe,it,expect} from 'vitest';
import {historicalDiscoveryHint} from './legacyDiscoveryHints';
describe('original search hints remain non-authoritative',()=>{
 it('returns only explicitly documented historical leads',()=>{
  expect(historicalDiscoveryHint('508')).toEqual({suggestedName:'F508del',status:'historical-unverified'});
  expect(historicalDiscoveryHint('the gating')?.suggestedName).toBe('G551D');
  expect(historicalDiscoveryHint('la variante gallega')?.status).toBe('historical-unverified');
 });
 it('never treats nomenclature, complex searches or unknown values as verified identities',()=>{
  for(const term of ['1001+11C/T','F508del, G551D','508 551','c.1521_1523delCTT','p.(Phe508del)','la variante inexistente','']){
   expect(historicalDiscoveryHint(term)).toBeNull();
  }
 });
});