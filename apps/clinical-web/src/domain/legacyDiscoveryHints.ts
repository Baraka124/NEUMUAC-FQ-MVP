/**
 * Historical discovery hints recovered from frozen index.1.html near L13200.
 * Not a synonym authority: never use to query, auto-open or assign identity.
 * Display as a cautious optional research lead only.
 */
const historicalHints:Readonly<Record<string,string>>=Object.freeze({
 '508':'F508del','551':'G551D','1282':'W1282X','542':'G542X',
 '553':'R553X','1303':'N1303K','117':'R117H','1162':'R1162X',
 'the gating':'G551D','gating mutation':'G551D',
 'deltaf508':'F508del','delta f508':'F508del',
 'la variante gallega':'F508del',
 'stop 1282':'W1282X'
});
export interface LegacyDiscoveryHint {
 readonly suggestedName:string;
 readonly status:'historical-unverified';
}
export function historicalDiscoveryHint(query:string):LegacyDiscoveryHint|null{
 const normalized=query.trim().toLowerCase().replace(/\s+/g,' ');
 const suggestedName=historicalHints[normalized];
 return suggestedName?{suggestedName,status:'historical-unverified'}:null;
}
