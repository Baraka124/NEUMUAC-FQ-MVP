import {canonicalIdentity} from './instantMatch';
import type {RealVariant} from '../services/liveVariants';

export interface TextMatchExplanation {
  readonly label:string;
  readonly matchedValue:string;
  readonly priority:number;
}
/** UI text relevance only; it is NOT pathogenicity, evidence quality or clinical ranking. */
const properties=[
  ['legacyName','Recorded name'],
  ['proteinName','Protein notation'],
  ['cdnaName','cDNA notation']
] as const;

export function explainTextMatch(variant:RealVariant,term:string):TextMatchExplanation|null {
  const q=canonicalIdentity(term);
  if(!q)return null;
  const candidates:{value:string;label:string;index:number}[]=[];
  properties.forEach(([key,label],index)=>{
    const value=variant[key];
    if(value)candidates.push({value,label,index});
  });
  variant.aliases.forEach(value=>{
    if(value)candidates.push({value,label:'Recorded alias',index:3});
  });
  let best:TextMatchExplanation|null=null;
  for(const candidate of candidates){
    const normalized=canonicalIdentity(candidate.value);
    const match=normalized===q ? 0 : normalized.startsWith(q) ? 1 : normalized.includes(q) ? 2 : -1;
    if(match<0)continue;
    const priority=match*4+candidate.index;
    if(best===null||priority<best.priority) {
      const prefix=match===0?'Exact':match===1?'Starts with':'Contains';
      best={label:prefix+' · '+candidate.label,matchedValue:candidate.value,priority};
    }
  }
  return best;
}

/**
 * Improve discovery within the currently returned server page only.
 * Whole-catalog relevance ordering requires a separately validated DB query.
 */
export function rankVisibleSearchPage(records:readonly RealVariant[],term:string):readonly RealVariant[]{
  if(!term.trim())return records;
  return [...records].map((record,index)=>({
    record,index,priority:explainTextMatch(record,term)?.priority??99
  })).sort((a,b)=>a.priority-b.priority||a.index-b.index).map(x=>x.record);
}

/** Explain which explicitly entered identifier matched this returned record.
 * This describes only the current result, never whole-catalog coverage,
 * allelic phase, or clinical genotype interpretation.
 */
export function explainMultiTermMatch(variant:RealVariant,terms:readonly string[]):string|null {
 const matches=terms.map(term=>({term,match:explainTextMatch(variant,term)}))
  .filter((entry):entry is {term:string;match:TextMatchExplanation}=>entry.match!==null)
  .sort((a,b)=>a.match.priority-b.match.priority);
 if(!matches.length)return null;
 const best=matches[0];
 return terms.length>1?best.term+' · '+best.match.label:best.match.label;
}
