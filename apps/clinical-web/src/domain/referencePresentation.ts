import type {LiveEvidenceReference} from '../services/liveEvidence';
/** Uniform display metadata from recorded links. Never infer source verification. */
export function referenceMetadata(entry:LiveEvidenceReference):readonly string[]{
 return [
  entry.source||'Source not recorded',
  entry.year===null?null:String(entry.year)+' (recorded)',
  entry.journal||null,
  entry.type?'Recorded type: '+entry.type:null,
  entry.category?'Recorded category: '+entry.category:null,
  entry.pmid?'PMID '+entry.pmid:null,
  entry.doi?'DOI '+entry.doi:null
 ].filter((part):part is string=>part!==null);
}

/** Keep the dossier's recorded-link preview bounded and factual.
 * Publication year is a browsing order only, never an evidence-quality score.
 * The separate evidence register remains paginated and complete.
 */
export const DOSSIER_REFERENCE_PREVIEW_LIMIT=10;
export function dossierReferencePreview(references:readonly LiveEvidenceReference[]):readonly LiveEvidenceReference[]{
 return [...references].sort((a,b)=>{
  if(a.year===null)return b.year===null?a.id-b.id:1;
  if(b.year===null)return -1;
  return b.year-a.year || a.id-b.id;
 }).slice(0,DOSSIER_REFERENCE_PREVIEW_LIMIT);
}


/**
 * Compare a URL to a *recorded* DOI or PubMed identifier.
 * Matching URL and stored metadata are internal consistency, NOT evidence
 * that the remote publication exists, supports a claim or has been reviewed.
 */
export type ReferenceLinkConsistency =
 | {readonly kind:'consistent';readonly label:string}
 | {readonly kind:'mismatch';readonly label:string}
 | {readonly kind:'unassessed';readonly label:string};
export function referenceLinkConsistency(entry:LiveEvidenceReference):ReferenceLinkConsistency{
 let url:URL;
 try{url=new URL(entry.url);}catch{return {kind:'unassessed',label:'Source URL could not be assessed'};}
 const host=url.hostname.toLowerCase();
 if(host==='doi.org'){
  const doi=entry.doi?.trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();
  let urlDoi:string;
  try{urlDoi=decodeURIComponent(url.pathname.slice(1)).toLowerCase();}
  catch{return {kind:'unassessed',label:'DOI link could not be compared'};}
  if(!doi)return {kind:'unassessed',label:'DOI not recorded; link identity not assessed'};
  return urlDoi===doi
   ?{kind:'consistent',label:'Recorded DOI and link agree'}
   :{kind:'mismatch',label:'Recorded DOI differs from linked DOI'};
 }
 if(host==='pubmed.ncbi.nlm.nih.gov'){
  const path=/^\/(\d{1,12})\/?$/.exec(url.pathname);
  const pmid=entry.pmid?.trim();
  if(!path||!pmid)return {kind:'unassessed',label:'PubMed link/PMID comparison unavailable'};
  return path[1]===pmid
   ?{kind:'consistent',label:'Recorded PMID and link agree'}
   :{kind:'mismatch',label:'Recorded PMID differs from linked PubMed record'};
 }
 return {kind:'unassessed',label:'Source link not identifier-compared'};
}
