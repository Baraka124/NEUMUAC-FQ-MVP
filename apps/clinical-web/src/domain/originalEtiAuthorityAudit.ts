import type {NamedVariant} from './legacyFiveRegimenRules';

/** Read-only preservation of ETI_AUTHORITY in the uploaded original
 * index (85)(1).html, lines 9504–9578 (59 historically positive aliases,
 * 15 historically negative aliases). Names reproduce the original data.
 *
 * WARNING: the original mixes FDA, EMA and research claims, and predates
 * later label expansions. These are NOT current authorizations or predicted
 * patient response. Never use to grant eligibility or overwrite a record.
 */
export const ORIGINAL_ETI_LISTED_ALIASES=Object.freeze([
 'F508del','p.Phe508del','c.1521_1523del','G551D','p.Gly551Asp',
 'G178R','G551S','S549N','S549R','G970R','G1244E','S1251N','S1255P',
 'G1349D','R117H','p.Arg117His','A455E','D110H','D1152H','E56K',
 'P67L','R347H','R352Q','E193K','L206W','S945L','S977F','F1052V',
 'K1060T','A1067T','G1069R','R1070Q','R1070W','F1074L','D579G',
 'S1235R','711+3A>G','711+3A→G','711+3A->G','2789+5G>A',
 '2789+5G→A','3272-26A>G','3272-26A→G','3849+10kbC>T',
 '3849+10kbC→T','3120+1G>A','3120+1G->A','3120+1G→A',
 '1898+3A>G','1898+3A->G','1898+3A→G','N1303K',
 'p.Asn1303Lys','R74W','D614G','R668C','S13F','I807M','I148T'
]);
export const ORIGINAL_ETI_NONRESPONSE_ALIASES=Object.freeze([
 'W1282X','p.Trp1282Ter','G542X','p.Gly542Ter','R553X',
 'p.Arg553Ter','R1162X','p.Arg1162Ter','Y1092X','p.Tyr1092Ter',
 '621+1G>T','621+1G→T','1717-1G>A','1717-1G→A','CFTRdele2,3'
]);
const canonical=(name:string):string=>name.trim().toUpperCase();
const positive=new Set(ORIGINAL_ETI_LISTED_ALIASES.map(canonical));
const negative=new Set(ORIGINAL_ETI_NONRESPONSE_ALIASES.map(canonical));

export type OriginalEtiListState='listed-positive'|'listed-negative'|'conflicting-aliases'|'not-listed';
export interface OriginalEtiListFinding{
 readonly variantId:string;
 readonly state:OriginalEtiListState;
 readonly positiveAliases:readonly string[];
 readonly negativeAliases:readonly string[];
 readonly recordedResponse:'responsive'|'non_responsive'|'unknown'|null;
 readonly discrepancy:boolean;
}
export function originalEtiListFinding(variant:NamedVariant):OriginalEtiListFinding{
 const names=Array.from(new Set(variant.names.filter(
  (s):s is string=>typeof s==='string'&&s.trim().length>0
 ).map(s=>s.trim())));
 const positiveAliases=names.filter(n=>positive.has(canonical(n)));
 const negativeAliases=names.filter(n=>negative.has(canonical(n)));
 const state:OriginalEtiListState=positiveAliases.length&&negativeAliases.length?
  'conflicting-aliases':positiveAliases.length?'listed-positive':
  negativeAliases.length?'listed-negative':'not-listed';
 const recordedResponse=variant.profile.entries.find(e=>e.therapy==='ETI')?.response??null;
 const discrepancy=(state==='listed-positive'&&recordedResponse==='non_responsive')||
  (state==='listed-negative'&&recordedResponse==='responsive')||
  state==='conflicting-aliases';
 return Object.freeze({
  variantId:variant.id,state,positiveAliases:Object.freeze(positiveAliases),
  negativeAliases:Object.freeze(negativeAliases),recordedResponse,discrepancy
 });
}
export const originalEtiListCaption=(state:OriginalEtiListState):string=>({
 'listed-positive':'Present in original positive-name list',
 'listed-negative':'Present in original non-response-name list',
 'conflicting-aliases':'Conflicting original name-list matches',
 'not-listed':'No original name-list match'
})[state];
