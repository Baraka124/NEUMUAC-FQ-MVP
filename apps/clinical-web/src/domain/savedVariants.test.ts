import {expect,it} from 'vitest';
import {MAX_SAVED_VARIANTS,readSavedVariantIds,SAVED_VARIANTS_KEY,savedVariantsCsv,toggleSavedVariant} from './savedVariants';

function memoryStorage(){
 const map=new Map<string,string>();
 return {
  getItem:(key:string)=>map.get(key)??null,
  setItem:(key:string,value:string)=>{map.set(key,value);}
 };
}
it('stores only canonical source IDs and toggles a saved record',()=>{
 const storage=memoryStorage();
 expect(toggleSavedVariant(storage,'32')).toEqual({ids:['32'],saved:true});
 expect(toggleSavedVariant(storage,'2')).toEqual({ids:['2','32'],saved:true});
 expect(toggleSavedVariant(storage,'32')).toEqual({ids:['2'],saved:false});
 expect(readSavedVariantIds(storage)).toEqual(['2']);
 expect(toggleSavedVariant(storage,'c.123A>G')).toBeNull();
 expect(toggleSavedVariant(storage,'01')).toBeNull();
 expect(toggleSavedVariant(storage,'0')).toBeNull();
 expect(toggleSavedVariant(storage,'3;=SUM(A1)')).toBeNull();
});
it('rejects corrupt storage, duplicates and noncanonical identifiers',()=>{
 const storage=memoryStorage();
 storage.setItem(SAVED_VARIANTS_KEY,JSON.stringify(['4','4','05','12','hello',12,'2']));
 expect(readSavedVariantIds(storage)).toEqual(['4','12','2']);
 storage.setItem(SAVED_VARIANTS_KEY,'not JSON');
 expect(readSavedVariantIds(storage)).toEqual([]);
 expect(readSavedVariantIds(null)).toEqual([]);
});
it('never claims persistence if browser storage fails',()=>{
 const broken={getItem:()=>null,setItem:()=>{throw Error('denied')}};
 expect(toggleSavedVariant(broken,'9')).toBeNull();
 expect(readSavedVariantIds({getItem:()=>{throw Error('denied')},setItem:()=>{}})).toEqual([]);
});
it('limits local worklist size and exports only safe identifiers',()=>{
 const storage=memoryStorage();
 storage.setItem(SAVED_VARIANTS_KEY,JSON.stringify(Array.from({length:MAX_SAVED_VARIANTS},(_,i)=>String(i+1))));
 expect(toggleSavedVariant(storage,'41')).toBeNull();
 const csv=savedVariantsCsv(['2','2','1','=HYPERLINK("unsafe")']);
 expect(csv).toContain('2,/#/variants/2');
 expect(csv).toContain('1,/#/variants/1');
 expect(csv).not.toContain('unsafe');
 expect(csv.split('2,/#/variants/2').length).toBe(2);
});
