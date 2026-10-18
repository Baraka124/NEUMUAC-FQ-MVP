/** Browser-only research worklist: no user identity, region, query, or patient data. */
export const SAVED_VARIANTS_KEY='neumuacfq_saved_variant_ids_v1';
export const MAX_SAVED_VARIANTS=40;
export interface SavedVariantStorage {
 getItem(key:string):string|null;
 setItem(key:string,value:string):void;
}
const isId=(v:unknown):v is string=>typeof v==='string'&&/^[1-9]\\d{0,17}$/.test(v);
export function readSavedVariantIds(storage:SavedVariantStorage|null):readonly string[]{
 if(!storage)return [];
 try {
  const raw=storage.getItem(SAVED_VARIANTS_KEY);
  if(!raw||raw.length>1500)return [];
  const parsed:unknown=JSON.parse(raw);
  if(!Array.isArray(parsed))return [];
  return [...new Set(parsed.filter(isId))].slice(0,MAX_SAVED_VARIANTS);
 }catch{return [];}
}
export function toggleSavedVariant(storage:SavedVariantStorage|null,id:unknown):{ids:readonly string[];saved:boolean}|null{
 if(!storage||!isId(id))return null;
 const current=[...readSavedVariantIds(storage)];
 const exists=current.includes(id);
 if(!exists&&current.length>=MAX_SAVED_VARIANTS)return null;
 const next=exists?current.filter(x=>x!==id):[id,...current];
 try{storage.setItem(SAVED_VARIANTS_KEY,JSON.stringify(next));return {ids:next,saved:!exists};}
 catch{return null;}
}
export function savedVariantsCsv(ids:readonly string[]):string{
 const clean=[...new Set(ids.filter(isId))].slice(0,MAX_SAVED_VARIANTS);
 return '\uFEFFvariant_id,application_route\r\n'+clean.map(id=>id+',/#/variants/'+id).join('\r\n')+'\r\n';
}
