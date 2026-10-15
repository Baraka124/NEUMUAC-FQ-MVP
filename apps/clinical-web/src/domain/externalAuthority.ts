/** NCBI ClinVar links based ONLY on recorded Variation IDs or VCV accessions. */
export function clinVarVariationUrl(raw:string|null):string|null{
 if(!raw)return null;
 const id=raw.trim();
 if(/^\d{1,12}$/.test(id)&&Number(id)>0)return 'https://www.ncbi.nlm.nih.gov/clinvar/variation/'+id+'/';
 if(/^VCV\d{9}(?:\.\d+)?$/i.test(id))return 'https://www.ncbi.nlm.nih.gov/clinvar/variation/'+id.toUpperCase()+'/';
 return null;
}
