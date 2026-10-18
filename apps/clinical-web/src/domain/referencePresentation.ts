import type {LiveEvidenceReference} from '../services/liveEvidence';
/** Uniform display metadata from recorded links. Never infer source verification. */
export function referenceMetadata(entry:LiveEvidenceReference):readonly string[]{
 return [
  entry.source||'Source not recorded',
  entry.year===null?null:String(entry.year)+' (recorded)',
  entry.journal||null,
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
