import type {RealVariant} from '../services/liveVariants';
import type {ResearchChronology,RecordedChronologyItem} from './recordedResearchChronology';

/** Export only successfully decoded, variant-scoped recorded metadata.
 * Not an immutable audit, complete clinical dossier, or independent validation. */
export const MAX_RECORDED_AUDIT_ROWS=600;

function csvCell(raw:string):string{
 const text=raw.replace(/[\r\n\t]+/g,' ').trim();
 const safe=/^[=+@-]/.test(text)?"'"+text:text;
 return '"'+safe.replaceAll('"','""')+'"';
}
function rowsValid(events:readonly RecordedChronologyItem[]):boolean{
 const keys=new Set<string>();
 for(const event of events){
  if(!/^[vc]:[1-9][0-9]{0,17}(?::(?:detected|resolved))?$/.test(event.key)||
   keys.has(event.key)||!event.heading.trim()||!event.details.trim()||
   (event.recordedAt!==null&&!Number.isFinite(Date.parse(event.recordedAt))))return false;
  keys.add(event.key);
 }
 return true;
}
export function recordedAuditCsv(variant:RealVariant,chronology:ResearchChronology):string|null{
 if(!/^[1-9][0-9]{0,17}$/.test(variant.id))return null;
 const events=[...chronology.dated,...chronology.undated];
 if(!events.length||events.length>MAX_RECORDED_AUDIT_ROWS||!rowsValid(events)||
    !Number.isSafeInteger(chronology.validationCount)||chronology.validationCount<0||
    !Number.isSafeInteger(chronology.conflictCount)||chronology.conflictCount<0||
    chronology.validationCount>200||chronology.conflictCount>200||
    chronology.dated.some(item=>item.recordedAt===null)||
    chronology.undated.some(item=>item.recordedAt!==null)||
    events.length<chronology.validationCount+chronology.conflictCount||
    events.length>chronology.validationCount+2*chronology.conflictCount)return null;
 const name=variant.legacyName||variant.proteinName||variant.cdnaName||variant.id;
 const header=['variant_id','recorded_variant_name','event_reference','event_kind','recorded_at_utc','recorded_event','recorded_metadata','date_scope'];
 const records=[...chronology.dated.map(x=>({item:x,scope:'dated'})),...chronology.undated.map(x=>({item:x,scope:'undated'}))];
 const lines=records.map(({item,scope})=>[
  variant.id,name,item.key,item.kind,item.recordedAt||'',item.heading,item.details,scope
 ].map(v=>csvCell(String(v))).join(','));
 return '\uFEFF'+header.join(',')+'\r\n'+lines.join('\r\n')+'\r\n';
}
