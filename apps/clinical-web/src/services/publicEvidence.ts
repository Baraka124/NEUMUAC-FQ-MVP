import raw from '../data/cftr-evidence-snapshot.json';
export interface EvidenceReference { id:number;variantId:string;type:string;title:string;url:string;source:string;category:string|null;journal:string|null;year:number|null;pmid:string|null;doi:string|null }
export const EVIDENCE_SNAPSHOT_DATE='14 October 2026';
export const EVIDENCE_REFERENCE_COUNT=154;
const allowed=/^https:\/\/(?:pubmed\.ncbi\.nlm\.nih\.gov|scholar\.google\.com|www\.ncbi\.nlm\.nih\.gov|cftr2\.org|doi\.org)\//;
const items:readonly EvidenceReference[]=Object.freeze(raw.records.map((r) => {
  if(r.length!==11||!allowed.test(String(r[4])))throw new Error('Unreviewed evidence link');
  return Object.freeze({id:Number(r[0]),variantId:String(r[1]),type:String(r[2]||''),title:String(r[3]),url:String(r[4]),source:String(r[5]||'Source not recorded'),category:r[6]?String(r[6]):null,journal:r[7]?String(r[7]):null,year:r[8]?Number(r[8]):null,pmid:r[9]?String(r[9]):null,doi:r[10]?String(r[10]):null});
}));
if(raw.record_count!==EVIDENCE_REFERENCE_COUNT || items.length!==EVIDENCE_REFERENCE_COUNT)throw new Error('Evidence catalog incomplete');
export const evidenceVariantCount=new Set(items.map(x=>x.variantId)).size;
export function evidenceForVariant(id:string):readonly EvidenceReference[]{return items.filter(x=>x.variantId===id)}
export function evidenceReferences():readonly EvidenceReference[]{return items}
