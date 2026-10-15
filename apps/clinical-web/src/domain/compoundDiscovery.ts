import {VariantConnectionError} from '../services/liveVariants';

/** Textual multi-variant discovery (OR), not genotype or clinical compound inference. */
export function parseDiscoveryTerms(query:string):readonly string[]{
 const parts=query.split(/[,;]/).map(x=>x.trim());
 if(parts.length>4||parts.some(x=>!x||x.length>75||!/^[a-zA-Z0-9 _.+>:\-]+$/.test(x)))
  throw new VariantConnectionError('request-failed','Enter 1–4 valid variant terms separated by commas.');
 return [...new Set(parts)];
}
export function buildDiscoveryExpression(terms:readonly string[],exact:boolean):string{
 const clauses:string[]=[];
 for(const term of terms){
  const pattern=exact?term:'*'+term+'*';
  for(const column of exact?['legacy_name','protein_name','cdna_name']:['legacy_name','protein_name','cdna_name','alt_names']){
   clauses.push(column+'.ilike.'+pattern);
  }
 }
 return '('+clauses.join(',')+')';
}
