import type {RealVariant,RealVariantSource,RecordedVariantResponse} from '../services/liveVariants';
import {MAX_SAVED_VARIANTS} from './savedVariants';
import {portableVariantLink} from './portableVariantReference';

/** A fresh, bounded, read-only export; never reuse browser-cached classifications. */
export interface SavedRecordSnapshot {
 readonly id:string;
 readonly recordUrl:string;
 readonly legacyName:string|null;
 readonly proteinName:string|null;
 readonly cdnaName:string|null;
 readonly recordedClass:string|null;
 readonly classSubtype:string|null;
 readonly recordedEti:RecordedVariantResponse;
 readonly recordedAlyftrek:RecordedVariantResponse;
 readonly validationCount:number|null;
}
const canonical=(id:unknown):id is string=>typeof id==='string'&&/^[1-9][0-9]{0,17}$/.test(id);
function controlled(value:unknown,max:number):string|null {
 if(value===null||value===undefined)return null;
 if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/.test(value))
  throw new Error('Recorded source metadata is malformed.');
 return value.trim()||null;
}
function response(value:unknown):RecordedVariantResponse {
 if(value===null||value===undefined)return null;
 if(value==='responsive'||value==='non_responsive'||value==='unknown')return value;
 throw new Error('Recorded response field is not recognized.');
}
function verifiedRecord(id:string,record:RealVariant|null,recordUrl:string):SavedRecordSnapshot {
 if(!record||record.id!==id)throw new Error('A saved record could not be independently verified.');
 const legacyName=controlled(record.legacyName,180);
 const proteinName=controlled(record.proteinName,180);
 const cdnaName=controlled(record.cdnaName,180);
 if(!legacyName&&!proteinName&&!cdnaName)
  throw new Error('A saved record has no verified recorded nomenclature.');
 if(record.validationCount!==null&&record.validationCount!==undefined&&
   (!Number.isSafeInteger(record.validationCount)||record.validationCount<0))
  throw new Error('Recorded validation count is invalid.');
 return Object.freeze({
  id,recordUrl,legacyName,proteinName,cdnaName,
  recordedClass:controlled(record.recordedClass,50),
  classSubtype:controlled(record.classSubtype,80),
  recordedEti:response(record.etiPrediction),recordedAlyftrek:response(record.alyftrekPrediction),
  validationCount:record.validationCount??null
 });
}

/** Fails closed on any stale, missing, malformed or inaccessible record; no partial export. */
export async function readSavedResearchSnapshot(
 source:Pick<RealVariantSource,'get'>,ids:readonly string[],currentHref:string,signal:AbortSignal,
 onProgress?:(completed:number,total:number)=>void
):Promise<readonly SavedRecordSnapshot[]> {
 if(!ids.length||ids.length>MAX_SAVED_VARIANTS||ids.some(id=>!canonical(id))||
   new Set(ids).size!==ids.length)throw new Error('Invalid saved variant worklist.');
 const targets=ids.map(id=>({id,url:portableVariantLink(id,currentHref)}));
 if(targets.some(x=>!x.url))throw new Error('A secure record link could not be prepared.');
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 signal.addEventListener('abort',cancel,{once:true});
 if(signal.aborted)controller.abort();
 const rows:(SavedRecordSnapshot|undefined)[]=Array(ids.length);
 let cursor=0,complete=0;
 async function worker():Promise<void>{
  while(cursor<targets.length){
   if(controller.signal.aborted)throw new Error('Snapshot read interrupted.');
   const index=cursor++,item=targets[index];
   try{
    const fresh=await source.get(item.id,controller.signal);
    if(controller.signal.aborted)throw new Error('Snapshot read interrupted.');
    rows[index]=verifiedRecord(item.id,fresh,item.url!);
    complete++;
    if(!controller.signal.aborted)onProgress?.(complete,targets.length);
   }catch(e){
    controller.abort();
    throw e;
   }
  }
 }
 try {
  await Promise.all(Array.from({length:Math.min(3,ids.length)},()=>worker()));
  if(controller.signal.aborted||rows.some(x=>!x))throw new Error('Snapshot incomplete.');
  return Object.freeze(rows as SavedRecordSnapshot[]);
 }finally{signal.removeEventListener('abort',cancel);}
}

function csvCell(value:string|number|null):string {
 const raw=String(value??'').slice(0,400).replace(/[\u0000-\u001f\u007f]/g,' ');
 const neutral=/^\s*[=+\-@]/.test(raw)?"'"+raw:raw;
 return '"'+neutral.replace(/"/g,'""')+'"';
}
/** Recorded database labels only; this is not an evidence assessment or clinical report. */
export function savedResearchSnapshotCsv(rows:readonly SavedRecordSnapshot[],exportedAt:string):string|null {
 if(!rows.length||rows.length>MAX_SAVED_VARIANTS||!Number.isFinite(Date.parse(exportedAt)))return null;
 if(rows.some(x=>!canonical(x.id)||!portableVariantLink(x.id,x.recordUrl)||
  !x.legacyName&&!x.proteinName&&!x.cdnaName)||
  new Set(rows.map(x=>x.id)).size!==rows.length)return null;
 const headers=['variant_id','recorded_name','protein_notation','cdna_notation',
  'recorded_class','recorded_subtype','recorded_eti','recorded_alyftrek',
  'recorded_validation_count','record_url','exported_utc'];
 const records=rows.map(x=>[
  x.id,x.legacyName,x.proteinName,x.cdnaName,x.recordedClass,x.classSubtype,
  x.recordedEti,x.recordedAlyftrek,x.validationCount,x.recordUrl,exportedAt
 ].map(csvCell).join(','));
 return '\uFEFF'+headers.join(',')+'\r\n'+records.join('\r\n')+'\r\n';
}
