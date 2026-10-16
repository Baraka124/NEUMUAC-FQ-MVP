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
