import type { VariantRecord } from './variantRecord';

export type SearchTier = 0 | 1 | 2 | 3 | 4;
export interface SearchHit { readonly record: VariantRecord; readonly tier: SearchTier; readonly field: string }
export interface SearchOutcome { readonly hits: readonly SearchHit[]; readonly normalized: string; readonly steps: readonly string[]; readonly blocked: boolean; readonly compound: boolean; readonly status: 'browse' | 'matched' | 'no-match' | 'blocked' }

const aa3: Record<string,string> = {ala:'a',arg:'r',asn:'n',asp:'d',cys:'c',gln:'q',glu:'e',gly:'g',his:'h',ile:'i',leu:'l',lys:'k',met:'m',phe:'f',pro:'p',ser:'s',thr:'t',trp:'w',tyr:'y',val:'v',stop:'x',ter:'x',opal:'x',amber:'x',ochre:'x'};
const aliases: Record<string,string> = {deltaf508:'f508del',deltaf508del:'f508del',phe508del:'f508del',df508:'f508del',cf508del:'f508del',w1282stop:'w1282x',w1282ter:'w1282x',g542stop:'g542x',g542ter:'g542x',r553stop:'r553x',r553ter:'r553x'};
const positions: Record<string,string> = {'508':'f508del','551':'g551d','1282':'w1282x','542':'g542x','553':'r553x','1303':'n1303k','117':'r117h','1162':'r1162x'};
/** Legacy-inspired search normalization, not approved HGVS nomenclature validation. */
export function normalizeScientificQuery(raw: string): { normalized: string; steps: string[] } {
  let s=raw.normalize('NFKC').trim();const steps:string[]=[];
  if(/^rs\d+$/i.test(s))return {normalized:s.toLowerCase(),steps:['rsID passed through']};
  const withoutChr=s.replace(/^(?:chr)?7[:\s][\d,.]+/i,'').trim();
  if(withoutChr!==s){s=withoutChr;steps.push('chromosome prefix stripped');}
  const delta=s.replace(/[δΔ]/g,'del');
  if(delta!==s){s=delta;steps.push('delta converted');}
  s=s.replace(/^\(+|\)+$/g,'').replace(/^[pcrmn]\./i,'');
  const beforeAA=s.toLowerCase();
  s=beforeAA.replace(/ala|arg|asn|asp|cys|gln|glu|gly|his|ile|leu|lys|met|phe|pro|ser|thr|trp|tyr|val|ter|stop|opal|amber|ochre/g,m=>aa3[m]??m);
  if(s!==beforeAA)steps.push('amino acids abbreviated');
  const beforeSpacing=s;
  s=s.replace(/->\s*/g,'>').replace(/[-\s]+/g,'').replace(/>\s*/g,'>').replace(/\s*>/g,'>');
  if(s!==beforeSpacing)steps.push('spacing normalized');
  const beforeSuffix=s;
  s=s.replace(/(del|ins|dup)[acgt]{1,6}$/i,'$1');
  if(beforeSuffix!==s)steps.push('nucleotide suffix normalized');
  if(aliases[s]){s=aliases[s];steps.push('curated legacy alias');}
  if(positions[s]){s=positions[s];steps.push('positional shortcut');}
  return {normalized:s,steps};
}
function phonetic(s:string):string{return s.toLowerCase().replace(/[aeiou]+(?=.)/g,'').replace(/(.)\1+/g,'$1').replace(/[^a-z0-9]/g,'').slice(0,12)}
function distance(a:string,b:string):number{
 const previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  let diagonal=previous[0];
  previous[0]=i;
  for(let j=1;j<=b.length;j++){
   const above=previous[j];
   previous[j]=a[i-1]===b[j-1]?diagonal:Math.min(diagonal,previous[j-1],above)+1;
   diagonal=above;
  }
 }
 return previous[b.length];
}
function invalid(raw:string):boolean{
 const q=raw.trim();if(!q||q.length>60||/https?:\/\/|@[\w.]+\.\w{2,}|^\/[\w/]+/.test(q)||/\([^)]{3,}\)/.test(q)||/^\d{7,}$/.test(q))return true;
 const words=q.split(/\s+/);if(words.length>=3&&words.every(w=>/^[a-z]{4,}$/i.test(w)))return true;
 if(words.length>=4&&!q.includes(':')&&!words.every(w=>/\d/.test(w)||/^[cp]\./i.test(w)||w.length<=3))return true;
 return ['treatment','patient','clinical','protein','disease','therapy','report','mutation'].includes(q.toLowerCase());
}
function keys(v:VariantRecord):{field:string;key:string}[]{
 const vals:[string,string|null][]=[['legacy_name',v.nomenclature.legacy],['protein_name',v.nomenclature.protein],['cdna_name',v.nomenclature.cdna],['display_name',v.name],...v.aliases.map(a=>['alt_names',a] as [string,string])];
 const output:{field:string;key:string}[]=[];
 for(const [field,val] of vals){if(!val)continue;const normalized=normalizeScientificQuery(val).normalized;for(const k of [val.toLowerCase().trim(),normalized])if(k&&!output.some(x=>x.field===field&&x.key===k))output.push({field,key:k});}
 return output;
}
export function searchScientificFixtures(records:readonly VariantRecord[],query:string):SearchOutcome{
 const clean=query.trim(),n=normalizeScientificQuery(clean);
 if(clean.length<2)return{hits:records.map(record=>({record,tier:0,field:'browse'})),normalized:n.normalized,steps:n.steps,blocked:false,compound:false,status:'browse'};
 if(invalid(clean))return{hits:[],normalized:n.normalized,steps:n.steps,blocked:true,compound:false,status:'blocked'};
 const parts=clean.split(/\s+/);
 if(parts.length>=2&&parts.length<=4&&parts.every(p=>/\d/.test(p)||/^[cp]\./i.test(p)||p.length<=3)){
   const found=new Map<string,SearchHit>();
   for(const p of parts)for(const hit of searchScientificFixtures(records,p).hits)if(!found.has(hit.record.id))found.set(hit.record.id,hit);
   return{hits:[...found.values()],normalized:n.normalized,steps:n.steps,blocked:false,compound:true,status:found.size?'matched':'no-match'};
 }
 const q=n.normalized;const numeric=/^\d+$/.test(q);
 const hits:SearchHit[]=[];
 for(const record of records){
  let best:{tier:SearchTier;field:string}|null=null;
  for(const {field,key} of keys(record)){
    const k=key.replace(/^[pcr]\./,'');
    let tier:SearchTier|undefined;
    if(k===q||key===clean.toLowerCase())tier=0;
    else if(k.startsWith(q)||(numeric&&k.includes(q)))tier=1;
    else if(k.includes(q)||(q.length>=3&&q.includes(k)))tier=2;
    else if(q.length>=4&&Math.abs(k.length-q.length)<=2&&distance(q,k)<= (q.length>=5?2:1))tier=3;
    else if(q.length>=4&&phonetic(k)===phonetic(q)&&phonetic(q).length>=2)tier=4;
    if(tier!==undefined&&(!best||tier<best.tier))best={tier,field};
  }
  if(best)hits.push({record,tier:best.tier,field:best.field});
 }
 hits.sort((a,b)=>a.tier-b.tier);
 return{hits,normalized:n.normalized,steps:n.steps,blocked:false,compound:false,status:hits.length?'matched':'no-match'};
}
