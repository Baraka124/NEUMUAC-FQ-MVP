/**
 * Geographic deep-link context is identity-only. There is currently no
 * verified per-variant geographic dataset in the public administrative atlas.
 * Never infer patient locations, prevalence, searches or institutions.
 */
export function canonicalGeographyVariantId(value:unknown):string|null {
 return typeof value==='string'&&/^[1-9][0-9]{0,17}$/.test(value)?value:null;
}

export function geographyVariantEmptyState(id:unknown):string|null {
 return canonicalGeographyVariantId(id)
  ?'No patient distribution is published. Verified researchers may see historical, privacy-thresholded search activity.'
  :null;
}
