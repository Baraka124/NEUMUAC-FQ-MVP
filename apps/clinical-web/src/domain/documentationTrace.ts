import type {RealVariant} from '../services/liveVariants';
import type {CoverageRow} from '../services/liveCoverage';

/** Recorded values only. Missing fields are not equivalent to missing research. */
export interface RecordedField {
 readonly label:string;
 readonly value:string|null;
}

export function recordedNomenclature(variant:RealVariant):readonly RecordedField[]{
 return [
  {label:'Legacy name',value:variant.legacyName},
  {label:'cDNA notation',value:variant.cdnaName},
  {label:'Protein notation',value:variant.proteinName},
  {label:'Recorded aliases',value:variant.aliases.length?variant.aliases.join(', '):null}
 ];
}

export function unspecifiedSourceLinks(row:CoverageRow):number{
 const summed=row.sources.reduce((count,source)=>{
  if(!Number.isSafeInteger(source.count)||source.count<1)throw new Error('Invalid source count');
  return count+source.count;
 },0);
 if(summed!==row.links)throw new Error('Incomplete recorded source breakdown');
 return row.sources.filter(s=>s.name===null).reduce((count,s)=>count+s.count,0);
}
