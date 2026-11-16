import {SPAIN_REGIONS} from './spainRegionalBoundaries';
import {canonicalGeographyVariantId} from './variantGeographyContext';
import type {RegionalResearchActivity} from './regionalResearchActivity';

/**
 * Versioned facts from the approved 14H162 SQL contract. These describe the
 * fixed query, never a clinical study, allele frequency or patient location.
 */
export const GEOGRAPHIC_RESEARCH_PROVENANCE=Object.freeze({
 dataset:'CFTR research search logs',
 method:'Matched variant searches · Spain',
 attribution:'Coarse IP-estimated region · ipapi.co',
 suppression:'20+ recorded events and 10+ distinct sessions per region',
 exclusions:'GPS-origin events and institution-history rows excluded',
 statement:'Historical platform searches may include tests. No patient distribution or prevalence is inferred.'
});

const availableRegionCodes=new Set(SPAIN_REGIONS.map(region=>region.code));

/** Region selection is view-only. No region, date or institution filter reaches the RPC. */
export function canonicalGeographicRegionCode(value:unknown):string|null {
 return typeof value==='string'&&availableRegionCodes.has(value)?value:null;
}

export function linkedRegionalAtlasQuery(variantId:unknown,regionCode:unknown):
 {variant:string;region:string}|null {
 const variant=canonicalGeographyVariantId(variantId);
 const region=canonicalGeographicRegionCode(regionCode);
 return variant&&region?{variant,region}:null;
}

export interface GeographicObservationWindow {
 readonly first:string;
 readonly last:string;
}
/**
 * Observation bounds are taken only from the ALREADY-PUBLISHED aggregate rows.
 * They do not claim the underlying dataset's full coverage or completeness.
 */
export function displayedGeographicObservationWindow(
 rows:readonly RegionalResearchActivity[]
):GeographicObservationWindow|null {
 if(!rows.length)return null;
 const lower=rows.map(row=>Date.parse(row.firstObservedAt));
 const upper=rows.map(row=>Date.parse(row.lastObservedAt));
 if([...lower,...upper].some(date=>!Number.isFinite(date)))return null;
 return {
  first:new Date(Math.min(...lower)).toISOString(),
  last:new Date(Math.max(...upper)).toISOString()
 };
}

/** The source timestamps are ISO/UTC; label timezone to avoid local ambiguity. */
export function observedWindowLabel(window:GeographicObservationWindow|null):string|null {
 if(!window)return null;
 const df=new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
 return df.format(new Date(window.first))+' – '+df.format(new Date(window.last))+' UTC';
}
