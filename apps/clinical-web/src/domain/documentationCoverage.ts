import type {CoverageRow} from '../services/liveCoverage';
import {variantDisplayName} from '../services/liveVariants';
import {unspecifiedSourceLinks} from './documentationTrace';

/** Documentation-only groupings derived from a complete live reference-link fetch.
 * Link count is neither research quality nor a clinical/curation priority score.
 */
export type DocumentationGroup='none'|'single'|'multiple'|'unnamed'|'all';
export interface DocumentationSummary {
  readonly none:number;
  readonly single:number;
  readonly multiple:number;
  readonly unnamed:number;
  readonly all:number;
}

function groupFor(count:number):Exclude<DocumentationGroup,'all'>{
  if(!Number.isSafeInteger(count)||count<0)throw new Error('Incomplete or invalid recorded reference count');
  return count===0?'none':count===1?'single':'multiple';
}

export function summarizeDocumentation(rows:readonly CoverageRow[]):DocumentationSummary{
  const result={none:0,single:0,multiple:0,unnamed:0,all:rows.length};
  for(const row of rows){
    result[groupFor(row.links)]++;
    if(unspecifiedSourceLinks(row)>0)result.unnamed++;
  }
  return result;
}

/** Literal textual discovery only. Do not invent nomenclature synonym links. */
export function filterDocumentation(
  rows:readonly CoverageRow[],
  group:DocumentationGroup,
  rawQuery:string
):readonly CoverageRow[]{
  const term=rawQuery.normalize('NFKC').trim().toLocaleLowerCase('en');
  return rows.filter(row=>{
    if(group==='unnamed' ? unspecifiedSourceLinks(row)===0 : group!=='all'&&groupFor(row.links)!==group)return false;
    if(!term)return true;
    return [row.variant.legacyName,row.variant.proteinName,row.variant.cdnaName,...row.variant.aliases]
      .some(name=>name?.normalize('NFKC').toLocaleLowerCase('en').includes(term));
  }).sort((a,b)=>a.links-b.links||
    variantDisplayName(a.variant).localeCompare(variantDisplayName(b.variant))||
    a.variant.id.localeCompare(b.variant.id));
}
