import {describe,it,expect} from 'vitest';
import {WORLD_ATLAS_BOUNDARIES} from './worldAtlasBoundaries';
import {boundaryCountryCode,boundaryCountryLabel,affiliationBoundaryCounts} from './worldCountryIdentity';
describe('world country identity',()=>{
 it('maps every assigned bundled boundary',()=>{for(const b of WORLD_ATLAS_BOUNDARIES)if(b.id!=='-99')expect(boundaryCountryCode(b.id)).toMatch(/^[A-Z]{2}$/);});
 it('resolves Spain and United States without localized string joins',()=>{
 expect(boundaryCountryCode('724')).toBe('ES');expect(boundaryCountryLabel('724')).toBe('Spain');
 expect(boundaryCountryCode('840')).toBe('US');expect(boundaryCountryLabel('840')).toBe('United States');
 });
 it('does not map unassigned territory or unknown IDs',()=>{expect(boundaryCountryCode('-99')).toBeNull();expect(boundaryCountryCode('999')).toBeNull();});
 it('counts unique resolved institutions only in supported countries',()=>{
 expect(affiliationBoundaryCounts([{id:'a',countryCode:'ES'},{id:'a',countryCode:'ES'},{id:'b',countryCode:'US'},{id:'c',countryCode:'XX'}],WORLD_ATLAS_BOUNDARIES)).toEqual({'724':1,'840':1});
 });
});
