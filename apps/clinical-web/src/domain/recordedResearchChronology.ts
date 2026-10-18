import type {ResearchHistory} from '../services/liveResearchHistory';

/**
 * Ordered presentation of recorded events, NOT an authenticated or immutable audit trail.
 * Null timestamps must never be assigned inferred dates or a chronological position.
 */
export type ChronologyKind='validation'|'conflict-detected'|'conflict-resolved';
export interface RecordedChronologyItem {
 readonly key:string;
 readonly kind:ChronologyKind;
 readonly heading:string;
 readonly details:string;
 readonly recordedAt:string|null;
 readonly timestampLabel:string;
}
export interface ResearchChronology {
 readonly dated:readonly RecordedChronologyItem[];
 readonly undated:readonly RecordedChronologyItem[];
 readonly validationCount:number;
 readonly conflictCount:number;
}
const canonical=(id:string)=>/^[1-9][0-9]{0,17}$/.test(id);
function timestamp(raw:string|null):{millis:number;label:string}|null|undefined{
 if(raw===null)return null;
 // A timezone is mandatory; avoid interpreting local clock values as verified ordering.
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(raw))return undefined;
 const millis=Date.parse(raw);
 if(!Number.isFinite(millis))return undefined;
 const date=new Date(millis);
 return {millis,label:date.toISOString().replace('T',' ').slice(0,16)+' UTC'};
}
export function recordedResearchChronology(history:ResearchHistory,variantId:string):ResearchChronology|null{
 if(!canonical(variantId)||history.validations.length>200||history.conflicts.length>200)return null;
 const validationIds=new Set<number>(),conflictIds=new Set<number>();
 const collected:{event:RecordedChronologyItem;millis:number|null}[]=[];
 function add(key:string,kind:ChronologyKind,heading:string,details:string,raw:string|null):boolean{
  const dated=timestamp(raw);
  if(dated===undefined)return false;
  collected.push({event:{key,kind,heading,details,recordedAt:raw,timestampLabel:dated?dated.label:'Date not recorded'},millis:dated?.millis??null});
  return true;
 }
 for(const v of history.validations){
  if(v.variantId!==variantId||!Number.isSafeInteger(v.id)||v.id<=0||validationIds.has(v.id))return null;
  validationIds.add(v.id);
  if(!add('v:'+v.id,'validation','Validation · '+v.action,
    'Recorded class: '+(v.recordedClass||'Not recorded')+' · Confidence: '+(v.confidence||'Not recorded'),v.at))return null;
 }
 for(const c of history.conflicts){
  if(c.variantId!==variantId||!Number.isSafeInteger(c.id)||c.id<=0||conflictIds.has(c.id)||typeof c.resolved!=='boolean')return null;
  conflictIds.add(c.id);
  const detected=timestamp(c.detectedAt),resolved=timestamp(c.resolvedAt);
  if(detected===undefined||resolved===undefined||
    (!c.resolved&&c.resolvedAt!==null)||
    (detected&&resolved&&resolved.millis<detected.millis))return null;
  const field=c.field||'Field not recorded';
  if(!add('c:'+c.id+':detected','conflict-detected','Conflict detected · '+field,
    'Recorded severity: '+(c.severity||'Not recorded')+' · Current status: '+(c.resolved?'Resolved':'Unresolved'),c.detectedAt))return null;
  if(c.resolved&&!add('c:'+c.id+':resolved','conflict-resolved','Resolution recorded · '+field,
    'The register marks this conflict resolved; the resolution was not independently reviewed.',c.resolvedAt))return null;
 }
 const dated=collected.filter(x=>x.millis!==null).sort((a,b)=>(b.millis!-a.millis!)||a.event.key.localeCompare(b.event.key)).map(x=>x.event);
 const undated=collected.filter(x=>x.millis===null).sort((a,b)=>a.event.key.localeCompare(b.event.key)).map(x=>x.event);
 return {dated,undated,validationCount:history.validations.length,conflictCount:history.conflicts.length};
}
