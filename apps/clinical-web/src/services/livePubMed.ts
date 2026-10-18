/**
 * On-demand official PubMed ESummary publication metadata. It is external
 * source indexing, not an independent appraisal of research design, accuracy,
 * strength of evidence or clinical relevance. No background fetch or cache.
 */
export interface PubMedPublicationMetadata {
 readonly pmid:string;
 readonly title:string|null;
 readonly publicationTypes:readonly string[];
 readonly retrievedAt:string;
 readonly sourceUrl:string;
}
export function supportedPubMedId(input:string|null|undefined):input is string{
 return typeof input==='string'&&/^[1-9]\d{0,11}$/.test(input);
}
function object(raw:unknown):Record<string,unknown>|null{
 return raw!==null&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:null;
}
export function decodePubMedMetadata(payload:unknown,pmid:string,retrievedAt:string):PubMedPublicationMetadata{
 if(!supportedPubMedId(pmid))throw new Error('Unsupported PubMed identifier');
 const result=object(object(payload)?.result);
 if(!result||!Array.isArray(result.uids)||result.uids.length!==1||
    String(result.uids[0])!==pmid)throw new Error('PubMed identity could not be established');
 const doc=object(result[pmid]);
 if(!doc||String(doc.uid)!==pmid)throw new Error('PubMed summary identity mismatch');
 const title=typeof doc.title==='string'&&doc.title.trim()&&doc.title.length<=800?doc.title.trim():null;
 const rawTypes=doc.pubtype;
 if(rawTypes!==undefined&&(!Array.isArray(rawTypes)||rawTypes.length>32||
    rawTypes.some(value=>typeof value!=='string'||!value.trim()||value.length>160)))
    throw new Error('PubMed publication types could not be assessed');
 const publicationTypes=Object.freeze(
  (rawTypes as string[]|undefined)?.map(value=>value.trim())??[]
 );
 return Object.freeze({pmid,title,publicationTypes,retrievedAt,
  sourceUrl:'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/'});
}
/** User-triggered and single-ID only; no query expansion, writing, retry or credentials. */
export async function retrievePubMedMetadata(
 pmid:string|null,transport:typeof fetch=fetch,signal?:AbortSignal
):Promise<PubMedPublicationMetadata>{
 if(!supportedPubMedId(pmid))throw new Error('No supported recorded PubMed identifier');
 const url=new URL('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi');
 url.search=new URLSearchParams({db:'pubmed',id:pmid,retmode:'json',tool:'neumuacfq'}).toString();
 const response=await transport(url.toString(),{
  method:'GET',credentials:'omit',cache:'no-store',redirect:'error',
  headers:{Accept:'application/json'},signal
 });
 if(!response.ok)throw new Error('PubMed authority service unavailable');
 const payload:unknown=await response.json();
 if(signal?.aborted)throw new Error('PubMed request cancelled');
 return decodePubMedMetadata(payload,pmid,new Date().toISOString());
}
