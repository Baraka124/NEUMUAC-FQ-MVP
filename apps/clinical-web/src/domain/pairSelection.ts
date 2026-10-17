/**
 * Two-variant comparison URL identity. This is not patient genotype
 * information and never asserts allelic phase or homozygosity.
 */
export function pairRecordId(value:unknown):string|null{
 return typeof value==='string'&&/^[1-9]\d{0,17}$/.test(value)?value:null;
}
export function pairSelectionQuery(query:Readonly<Record<string,unknown>>,slot:0|1,id:string|null):Record<string,string>{
 const next:Record<string,string>={};
 const a=pairRecordId(query.a),b=pairRecordId(query.b);
 if(a)next.a=a;
 if(b)next.b=b;
 if(id!==null&&!pairRecordId(id))throw new Error('Invalid variant identifier');
 const key=slot===0?'a':'b';
 if(id===null)delete next[key];
 else next[key]=id;
 return next;
}
