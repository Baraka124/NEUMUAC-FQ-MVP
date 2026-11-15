import type {RealVariant,RealVariantSource} from '../services/liveVariants';
import {assessScientificDiscovery} from './compoundDiscovery';

export const MAX_BATCH_LOOKUP=100;
export const MAX_BATCH_TEXT=12000;
export type BatchMatchKind='exact'|'candidates'|'not-found'|'invalid'|'unavailable';
export interface BatchLookupRow {
 readonly input:string;
 readonly kind:BatchMatchKind;
 readonly match:RealVariant|null;
 readonly candidates:readonly RealVariant[];
 readonly moreCandidates:boolean;
 readonly message:string;
}
export interface BatchInputItem {readonly input:string;readonly valid:boolean;readonly duplicate:boolean}
export interface ParsedBatchInput {readonly items:readonly BatchInputItem[];readonly error:string|null}
const validId=(value:string)=>/^[1-9]\d{0,17}$/.test(value);
const controls=/[\u0000-\u0008\u000b-\u001f\u007f]/;
export function parseBatchVariantText(text:string):ParsedBatchInput{
 if(typeof text!=='string'||text.length>MAX_BATCH_TEXT)return {items:[],error:'The pasted input is too large. Process a smaller group of variant identifiers.'};
 // Accept independent names pasted line-by-line, from spreadsheets, or as a
 // comma/semicolon list. Never forward multiline raw input to the search API.
 const tokens=text.split(/[\n\r,;\t]+/).map(s=>s.trim()).filter(Boolean);
 if(!tokens.length)return {items:[],error:'Paste at least one recorded variant identifier.'};
 if(tokens.length>MAX_BATCH_LOOKUP)return {items:[],error:'Process up to 100 identifiers per batch. Additional batches can be searched separately.'};
 const seen=new Set<string>();
 const items=tokens.map(token=>{
  const norm=token.toLowerCase();
  const duplicate=seen.has(norm);seen.add(norm);
  // Numeric record IDs are canonical positive decimals, including one-digit IDs.
  // Reject numeric-looking alternatives (0, 01, overlong IDs) rather than
  // treating them as unverified nomenclature or fuzzy search terms.
  const valid=token.length<=75&&!controls.test(token)&&(
   validId(token)||(token.length>=2&&!/^\d+$/.test(token)&&!assessScientificDiscovery(token).blocked)
  );
  return Object.freeze({input:token,valid,duplicate});
 });
 return {items,error:null};
}
function output(input:string,kind:BatchMatchKind,match:RealVariant|null=null,
 candidates:readonly RealVariant[]=[],moreCandidates=false,message=''):BatchLookupRow{
 return Object.freeze({input,kind,match,candidates:Object.freeze(candidates),moreCandidates,message});
}
export async function resolveBatchVariants(
 source:RealVariantSource,raw:string,signal:AbortSignal,
 onProgress?:(completed:number,total:number)=>void
):Promise<readonly BatchLookupRow[]>{
 const parsed=parseBatchVariantText(raw);
 if(parsed.error)throw new Error(parsed.error);
 const items=parsed.items;
 const results:(BatchLookupRow|undefined)[]=Array(items.length);
 let cursor=0,completed=0;
 async function worker():Promise<void>{
  while(cursor<items.length){
   if(signal.aborted)throw new Error('Batch lookup cancelled');
   const index=cursor++,item=items[index];
   if(!item.valid){
    results[index]=output(item.input,'invalid',null,[],false,'Unsupported or unclear variant input.');
   }else if(item.duplicate){
    results[index]=output(item.input,'invalid',null,[],false,'Repeated input · already listed above.');
   }else{
    try{
     const exact=validId(item.input)
      ?await source.get(item.input,signal)
      :await source.resolveExact(item.input,'all',signal);
     if(signal.aborted)throw new Error('Batch lookup cancelled');
     if(exact){
      results[index]=output(item.input,'exact',exact,[],false,'Unambiguous recorded identity.');
     }else{
      const page=await source.list({query:item.input,page:0,searchMode:'contains',signal});
      if(signal.aborted)throw new Error('Batch lookup cancelled');
      const candidates=page.records.slice(0,3);
      results[index]=candidates.length
       ?output(item.input,'candidates',null,candidates,
         page.hasMore||page.records.length>3,'Possible catalog entries · verify each identity before opening.')
       :output(item.input,'not-found',null,[],false,'No matching accessible catalog record was found.');
     }
    }catch{
     if(signal.aborted)throw new Error('Batch lookup cancelled');
     results[index]=output(item.input,'unavailable',null,[],false,'The live source could not confirm this entry.');
    }
   }
   completed++;
   if(!signal.aborted)onProgress?.(completed,items.length);
  }
 }
 await Promise.all(Array.from({length:Math.min(3,items.length)},()=>worker()));
 if(signal.aborted||results.some(x=>!x))throw new Error('Batch lookup incomplete');
 return results as readonly BatchLookupRow[];
}

/** Download explicit per-item batch results without claiming candidate resolution. */
export function batchLookupCsv(rows:readonly BatchLookupRow[]):string|null{
 if(!rows.length||rows.length>MAX_BATCH_LOOKUP)return null;
 const safe=(value:string|null|undefined)=>{
  const text=String(value??'').replace(/[\r\n\t]/g,' ').slice(0,200);
  const neutral=/^\s*[=+\-@]/.test(text)?"'"+text:text;
  return '"'+neutral.replace(/"/g,'""')+'"';
 };
 const data=['query,status,confirmed_variant_id,recorded_name,recorded_class,recorded_eti,recorded_alyftrek,unverified_candidate_ids,note'];
 for(const row of rows){
  if(!['exact','candidates','not-found','invalid','unavailable'].includes(row.kind))return null;
  const x=row.match;
  data.push([
   row.input,row.kind,x?.id??'',x?.legacyName||x?.proteinName||x?.cdnaName||'',
   x?.recordedClass??'',x?.etiPrediction??'',x?.alyftrekPrediction??'',
   row.candidates.map(v=>v.id).join(';'),
   row.kind==='candidates'?'Unverified search suggestions; no unique confirmed identity':row.message
  ].map(safe).join(','));
 }
 return '\uFEFF'+data.join('\r\n')+'\r\n';
}
