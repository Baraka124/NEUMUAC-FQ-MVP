/** Original index.html, AREA 3 (lines 36814–36858): R117H is a
 * haplotype-dependent finding. A two-record comparison does not contain
 * intron-8 poly-T/TG context, so it must never silently assess it.
 *
 * Exact recorded-name matching only: no guessing from partial strings,
 * functional class, or potential aliases that are not present in the record.
 */
export interface NamedResearchVariant{
 readonly id:string;
 readonly names:readonly (string|null)[];
}
export interface HaplotypeContextFinding{
 readonly variantId:string;
 readonly marker:'R117H';
 readonly modifier:'Intron 8 poly-T and TG repeat context';
 readonly status:'not-assessed';
}
export function haplotypeContextFindings(
 variants:readonly NamedResearchVariant[]
):readonly HaplotypeContextFinding[]{
 const findings:HaplotypeContextFinding[]=[];
 for(const variant of variants){
  if(!variant.id||!variant.names.some(name=>typeof name==='string'&&name.trim().toUpperCase()==='R117H'))continue;
  if(findings.some(item=>item.variantId===variant.id))continue;
  findings.push(Object.freeze({variantId:variant.id,marker:'R117H' as const,
   modifier:'Intron 8 poly-T and TG repeat context' as const,status:'not-assessed' as const}));
 }
 return Object.freeze(findings);
}
