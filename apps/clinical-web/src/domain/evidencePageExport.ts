import type {LiveEvidenceReference} from '../services/liveEvidence';
import {EVIDENCE_PAGE_SIZE} from '../services/liveEvidence';

/**
 * Export *only* the complete page currently returned by the authorized
 * read-only source. No inferred scores, conclusions, or full-catalog claims.
 */
function csvCell(value:string|number|null):string{
 const text=String(value??'').replace(/[\t\r\n]+/g,' ').trim();
 // Quoting by itself does not prevent spreadsheet formula execution.
 const safe=/^[=+@-]/.test(text)?"'"+text:text;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function evidencePageCsv(records:readonly LiveEvidenceReference[]):string|null{
 if(!records.length||records.length>EVIDENCE_PAGE_SIZE)return null;
 const seen=new Set<number>();
 for(const record of records){
  if(!Number.isSafeInteger(record.id)||record.id<=0||seen.has(record.id)||
     !/^[1-9][0-9]{0,17}$/.test(record.variantId)||
     !record.title.trim()||!record.url.startsWith('https://'))return null;
  seen.add(record.id);
 }
 const header=['reference_id','variant_id','source','title','recorded_year','journal','pmid','doi','source_url'];
 const lines=records.map(item=>[
  item.id,item.variantId,item.source,item.title,item.year,item.journal,item.pmid,item.doi,item.url
 ].map(csvCell).join(','));
 return '\uFEFF'+header.join(',')+'\r\n'+lines.join('\r\n')+'\r\n';
}
