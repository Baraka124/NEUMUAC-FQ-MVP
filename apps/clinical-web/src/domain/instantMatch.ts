import type {RealVariant} from '../services/liveVariants';
/** Auto-open ONLY if one identity-equivalent match exists in the full available
 * search response. A page of 40 is not proof of uniqueness when hasMore=true.
 * No positional guesses, fuzzy normalization, or clinical classification used.
 */
export function canonicalIdentity(term:string):string{
 // HGVS namespaces carry meaning. Never conflate p., c. and bare aliases.
 return term.normalize('NFKC').trim().toLocaleLowerCase('en');
}
export function unambiguousExactMatch(term:string,records:readonly RealVariant[],hasMore:boolean):RealVariant|null{
 const q=canonicalIdentity(term);
 if(q.length<2||hasMore)return null;
 const candidates=records.filter(record=>[
  record.legacyName,record.proteinName,record.cdnaName,...record.aliases
 ].some(v=>v&&canonicalIdentity(v)===q));
 const unique=new Map(candidates.map(x=>[x.id,x]));
 return unique.size===1?[...unique.values()][0]:null;
}
