import {describe,expect,it} from 'vitest';
import {
 canonicalGeographicRegionCode,displayedGeographicObservationWindow,
 linkedRegionalAtlasQuery,observedWindowLabel,GEOGRAPHIC_RESEARCH_PROVENANCE
} from './geographicResearchProvenance';
import type {RegionalResearchActivity} from './regionalResearchActivity';

const sample=(regionCode:string,from:string,to:string):RegionalResearchActivity=>({
 regionCode,searchEvents:25,distinctSessions:11,firstObservedAt:from,lastObservedAt:to
});
describe('14H164: traceable and view-only geographic research context',()=>{
 it('only accepts 19 exact Spanish boundary codes and separately verified record identities',()=>{
  for(const code of Array.from({length:19},(_,i)=>String(i+1).padStart(2,'0')))
   expect(canonicalGeographicRegionCode(code)).toBe(code);
  for(const bad of [null,undefined,'12; DROP','Galicia','1','00','20',12,['12'],{},'12/../','12%'])
   expect(canonicalGeographicRegionCode(bad)).toBeNull();
  expect(linkedRegionalAtlasQuery('18','12')).toEqual({variant:'18',region:'12'});
  for(const [id,code] of [['01','12'],['18','Galicia'],['18','20'],[null,'12']])
   expect(linkedRegionalAtlasQuery(id,code)).toBeNull();
 });
 it('derives observation dates only from displayed eligible aggregate rows',()=>{
  const rows=[
   sample('12','2026-04-15T23:45:00Z','2026-05-15T00:00:00Z'),
   sample('13','2026-04-01T05:00:00Z','2026-05-30T15:08:23Z')
  ];
  const window=displayedGeographicObservationWindow(rows);
  expect(window).toEqual({first:'2026-04-01T05:00:00.000Z',last:'2026-05-30T15:08:23.000Z'});
  expect(observedWindowLabel(window)).toBe('1 Apr 2026 – 30 May 2026 UTC');
  expect(displayedGeographicObservationWindow([])).toBeNull();
  expect(observedWindowLabel(null)).toBeNull();
  expect(displayedGeographicObservationWindow([sample('12','invalid','2026-05-01T00:00:00Z')])).toBeNull();
 });
 it('keeps server-proven provenance exact and prohibits prevalence in the display',()=>{
  expect(GEOGRAPHIC_RESEARCH_PROVENANCE.dataset).toBe('CFTR research search logs');
  expect(GEOGRAPHIC_RESEARCH_PROVENANCE.attribution).toContain('ipapi.co');
  expect(GEOGRAPHIC_RESEARCH_PROVENANCE.exclusions).toContain('GPS');
  expect(GEOGRAPHIC_RESEARCH_PROVENANCE.statement).toContain('No patient distribution');
 });
});
