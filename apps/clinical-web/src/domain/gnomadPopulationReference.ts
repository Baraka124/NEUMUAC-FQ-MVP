/**
 * Source: user-designated original index (86).html, 16 November 2026,
 * lines 8188–8459 (SHA-256 5c7dce0258cf2ba4191c9eff0781ee3d02886b9e026b078e1fb51601f42fe9c5).
 *
 * Independent public-reference frequency domain. NOT the Geographic atlas.
 * A gnomAD ancestry/population grouping is not a country, location of search,
 * patient residence, CF prevalence, CFTR dysfunction or treatment response.
 * No ACMG criteria are assigned automatically; no database writes or caching.
 *
 * Deliberately NOT wired to the clinical dossier until the existing catalog
 * exposes an independently verified GRCh38 genomic allele for that record.
 */
export const GNOMAD_DATASET='gnomad_r4' as const;
export const GNOMAD_ASSEMBLY='GRCh38' as const;
export const GNOMAD_ENDPOINT='https://gnomad.broadinstitute.org/api' as const;

export interface GnomadPopulationCounts {
 readonly id:string;
 readonly alleleCount:number;
 readonly alleleNumber:number;
 /** Source counts divided by allele number, NOT a clinical prevalence rate. */
 readonly alleleFrequency:number;
}
export interface GnomadCallsetCounts {
 readonly alleleCount:number;
 readonly alleleNumber:number;
 readonly alleleFrequency:number;
 readonly populations:readonly GnomadPopulationCounts[];
}
export interface GnomadPopulationReference {
 readonly dataset:typeof GNOMAD_DATASET;
 readonly assembly:typeof GNOMAD_ASSEMBLY;
 readonly variantId:string;
 /** Exome and genome samples are reported separately; do not silently combine. */
 readonly exome:GnomadCallsetCounts|null;
 readonly genome:GnomadCallsetCounts|null;
}
export type GnomadReferenceResult=
 |{readonly state:'available';readonly record:GnomadPopulationReference}
 |{readonly state:'not-found'|'no-coverage'}
 |{readonly state:'unavailable';readonly reason:'network'|'http-error'|'invalid-response'};

export function canonicalCFTRGnomadVariantId(id:unknown,assembly:unknown):string|null{
 // CHROM-POS-REF-ALT, GRCh38 only. CFTR is on chr7; the *record* to
 // coordinate mapping still needs authoritative review before using this.
 if(assembly!==GNOMAD_ASSEMBLY||typeof id!=='string')return null;
 const match=/^7-([1-9][0-9]{0,8})-([ACGT]{1,100})-([ACGT]{1,100})$/.exec(id);
 if(!match)return null;
 const position=Number(match[1]);
 if(!Number.isSafeInteger(position)||position>159345973||match[2]===match[3])return null;
 return id;
}

/** Fixed GraphQL document. Variable values never enter executable query text. */
export const GNOMAD_POPULATION_QUERY=`query NFQGnomadPopulation($variantId:String!){
 variant(variantId:$variantId,dataset:gnomad_r4){
  variant_id
  reference_genome
  genome{ac an af populations{id ac an af}}
  exome{ac an af populations{id ac an af}}
 }
}` as const;

export function gnomadPopulationQueryBody(id:unknown,assembly:unknown):
 {readonly query:typeof GNOMAD_POPULATION_QUERY;readonly variables:{readonly variantId:string}}|null{
 const variantId=canonicalCFTRGnomadVariantId(id,assembly);
 return variantId?{query:GNOMAD_POPULATION_QUERY,variables:{variantId}}:null;
}

function object(value:unknown):Record<string,unknown>|null{
 return value&&typeof value==='object'&&!Array.isArray(value)
  ?value as Record<string,unknown>:null;
}
function counts(input:unknown):{ac:number;an:number;af:number}|null{
 if(input===null||input===undefined)return null;
 const row=object(input);
 if(!row)throw Error('Invalid gnomAD count object');
 const ac=row.ac,an=row.an;
 if(!Number.isSafeInteger(ac)||!Number.isSafeInteger(an)||typeof ac!=='number'||typeof an!=='number'||
   ac<0||an<0||ac>an)throw Error('Invalid gnomAD allele counts');
 if(an===0){
  if(ac!==0||(row.af!==undefined&&row.af!==null&&row.af!==0))
   throw Error('Invalid zero-coverage allele count');
  return null;
 }
 const af=ac/an;
 // The display is derived from checked source counts. Reject incompatible
 // upstream AF rather than inventing/rounding away a discrepancy.
 if(row.af!==null&&row.af!==undefined){
  if(typeof row.af!=='number'||!Number.isFinite(row.af)||row.af<0||row.af>1||
     Math.abs(row.af-af)>0.000001)
   throw Error('Inconsistent gnomAD allele frequency');
 }
 return {ac,an,af};
}
function callset(input:unknown):GnomadCallsetCounts|null{
 if(input===null||input===undefined)return null;
 const row=object(input);
 if(!row)throw Error('Invalid gnomAD callset');
 const total=counts(row);
 if(!total)return null;
 if(row.populations!==null&&row.populations!==undefined&&!Array.isArray(row.populations))
  throw Error('Invalid gnomAD population array');
 const seen=new Set<string>(),populations:GnomadPopulationCounts[]=[];
 for(const item of (row.populations as unknown[]|null|undefined)??[]){
  const population=object(item);
  if(!population||typeof population.id!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(population.id))
   throw Error('Invalid gnomAD population ID');
  if(seen.has(population.id))throw Error('Duplicate gnomAD population ID');
  seen.add(population.id);
  const obs=counts(population);
  if(!obs)continue; // unavailable denominator, not zero-frequency evidence
  populations.push({
   id:population.id,alleleCount:obs.ac,
   alleleNumber:obs.an,alleleFrequency:obs.af
  });
  if(populations.length>200)throw Error('Excessive population data');
 }
 // Never translate ancestry grouping into maps, addresses or prevalence claims.
 return {
  alleleCount:total.ac,alleleNumber:total.an,alleleFrequency:total.af,
  populations
 };
}

/** Pure, fail-closed decoder of a gnomAD GraphQL result. */
export function decodeGnomadPopulationResponse(payload:unknown,id:string):
 GnomadReferenceResult{
 const variantId=canonicalCFTRGnomadVariantId(id,GNOMAD_ASSEMBLY);
 if(!variantId)throw Error('Unverified genomic variant identifier');
 const root=object(payload);
 if(!root||('errors' in root&&Array.isArray(root.errors)&&root.errors.length>0))
  throw Error('gnomAD GraphQL response unavailable');
 const data=object(root.data);
 if(!data||!Object.hasOwn(data,'variant'))throw Error('gnomAD variant response missing');
 if(data.variant===null)return {state:'not-found'};
 const variant=object(data.variant);
 if(!variant||variant.variant_id!==variantId||
    variant.reference_genome!==GNOMAD_ASSEMBLY)
  throw Error('gnomAD variant identity or assembly mismatch');
 const exome=callset(variant.exome),genome=callset(variant.genome);
 if(!exome&&!genome)return {state:'no-coverage'};
 return {state:'available',record:{
  dataset:GNOMAD_DATASET,assembly:GNOMAD_ASSEMBLY,variantId,exome,genome
 }};
}

/** Explicit user-initiated read only; caller must supply a verified record allele.
 * This is not used on dossier mount, search, or background prefetch.
 */
export async function fetchGnomadPopulationReference(
 id:unknown,assembly:unknown,transport:typeof fetch=fetch,signal?:AbortSignal
):Promise<GnomadReferenceResult>{
 const body=gnomadPopulationQueryBody(id,assembly);
 if(!body)return {state:'unavailable',reason:'invalid-response'};
 let response:Response;
 try{
  response=await transport(GNOMAD_ENDPOINT,{
   method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},
   credentials:'omit',cache:'no-store',redirect:'error',signal,
   body:JSON.stringify(body)
  });
 }catch(error){
  if(signal?.aborted)throw error;
  return {state:'unavailable',reason:'network'};
 }
 if(!response.ok)return {state:'unavailable',reason:'http-error'};
 try{return decodeGnomadPopulationResponse(await response.json(),body.variables.variantId);}
 catch{return {state:'unavailable',reason:'invalid-response'};}
}
