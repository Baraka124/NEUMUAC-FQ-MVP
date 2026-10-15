/**
 * Phase 4C: classify EXTERNAL LINKS already attached to an exact variant ID.
 * This does not establish that the source page still exists, contains that variant,
 * supports any claimed CFTR classification, or permits bulk data ingestion.
 *
 * Never synthesize an external variant-page URL from a nomenclature string.
 */
export type ExternalReferenceKind='CFTR2'|'ClinVar'|'PubMed'|'DOI'|'Other';
export interface ExternalReferenceDescriptor {
 readonly kind:ExternalReferenceKind;
 readonly label:string;
 readonly isExternalDatabase:boolean;
 readonly verification:'linked-only';
 readonly explanation:string;
}
const generic:ExternalReferenceDescriptor=Object.freeze({
 kind:'Other',label:'External source',isExternalDatabase:false,
 verification:'linked-only',explanation:'The linked source has not been independently verified.'
});
const cftr2:ExternalReferenceDescriptor=Object.freeze({
 kind:'CFTR2',label:'CFTR2',isExternalDatabase:true,
 verification:'linked-only',
 explanation:'A CFTR2 reference link is available. Its content, identity and currency have not been verified in NeumuacFQ.'
});
const clinvar:ExternalReferenceDescriptor=Object.freeze({
 kind:'ClinVar',label:'ClinVar',isExternalDatabase:true,
 verification:'linked-only',
 explanation:'A ClinVar reference link is available. Its interpretation must be checked with the source.'
});
const pubmed:ExternalReferenceDescriptor=Object.freeze({
 kind:'PubMed',label:'PubMed',isExternalDatabase:false,
 verification:'linked-only',
 explanation:'A publication link is available. No scientific conclusion is inferred from that link.'
});
const doi:ExternalReferenceDescriptor=Object.freeze({
 kind:'DOI',label:'DOI',isExternalDatabase:false,
 verification:'linked-only',
 explanation:'A DOI link is available. No publication findings are independently assessed.'
});
export function classifyExternalReferenceUrl(raw:string):ExternalReferenceDescriptor {
 let uri:URL;
 try {uri=new URL(raw);} catch {return generic;}
 if(uri.protocol!=='https:'||uri.username||uri.password||uri.port)return generic;
 const host=uri.hostname.toLowerCase();
 if(host==='cftr2.org'||host==='www.cftr2.org')return cftr2;
 if(host==='doi.org')return doi;
 if(host==='pubmed.ncbi.nlm.nih.gov'||(host==='www.ncbi.nlm.nih.gov'&&uri.pathname.startsWith('/pubmed/')))return pubmed;
 if(host==='www.ncbi.nlm.nih.gov'&&/^\/clinvar(?:\/|$)/.test(uri.pathname))return clinvar;
 return generic;
}

/** Pure selector: accepts an already fetched, per-variant reference list. */
export function cftr2LinkedReferences<T extends {readonly url:string}>(rows:readonly T[]):readonly T[]{
 return rows.filter(r=>classifyExternalReferenceUrl(r.url).kind==='CFTR2');
}
