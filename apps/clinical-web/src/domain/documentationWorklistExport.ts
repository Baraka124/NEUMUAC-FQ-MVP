import type {CoverageRow} from '../services/liveCoverage';
import {unspecifiedSourceLinks} from './documentationTrace';

/** Export of a complete, currently filtered *accessible* documentation worklist.
 * Not a clinical priority queue, source validation, or global research survey.
 */
export const MAX_DOCUMENTATION_EXPORT_ROWS=5000;
function cell(value:string|number|null):string{
 const plain=String(value??'').replace(/[\t\r\n\u0000-\u001f]+/g,' ').trim();
 const safe=/^[=+@-]/.test(plain)?"'"+plain:plain;
 return '"'+safe.replaceAll('"','""')+'"';
}
export function documentationWorklistCsv(rows:readonly CoverageRow[]):string|null{
 if(!rows.length||rows.length>MAX_DOCUMENTATION_EXPORT_ROWS)return null;
 const ids=new Set<string>();
 const lines:string[]=[];
 for(const row of rows){
  const id=row.variant.id;
  if(!/^[1-9][0-9]{0,17}$/.test(id)||ids.has(id)||!Number.isSafeInteger(row.links)||row.links<0)return null;
  ids.add(id);
  let missing:number;
  try{missing=unspecifiedSourceLinks(row);}catch{return null;}
  const values=[
   id,row.variant.legacyName,row.variant.proteinName,row.variant.cdnaName,
   row.links,missing
  ];
  lines.push(values.map(cell).join(','));
 }
 const headers=['variant_id','recorded_name','recorded_protein','recorded_cdna','recorded_reference_links','links_without_source_name'];
 return '\uFEFF'+headers.join(',')+'\r\n'+lines.join('\r\n')+'\r\n';
}
