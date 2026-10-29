import type {LegacyEtiRecord} from '../services/legacyEtiResponse';
import type {SourceSpecificResponse,RecordedModulatorResponse} from '../services/sourceSpecificResponse';

/** NFQ-015: compare independently recorded historical fields. This is data
 * continuity screening, not scientific contradiction adjudication. */
export type ParitySignalKind=
 'category-flag-disagreement'|'category-source-disagreement'|'source-source-disagreement'|
 'category-unknown'|'no-source-records'|'no-source-eti-finding';
export interface ParitySignal {
 readonly kind:ParitySignalKind;
 readonly description:string;
 readonly evidenceIds:readonly string[];
}
export interface RecordedResponseParity {
 readonly variantId:string;
 readonly sourceRecords:number;
 readonly etiRecords:number;
 readonly signals:readonly ParitySignal[];
 readonly state:'requires-review'|'incomplete'|'aligned-recorded-fields';
}
/** A false legacy flag must never become a scientific nonresponse finding. */
export function assessRecordedResponseParity(
 legacy:LegacyEtiRecord,sourceRows:readonly SourceSpecificResponse[]
):RecordedResponseParity {
 if(sourceRows.some(row=>row.variantId!==legacy.id))
  throw new Error('Cannot compare unrelated source records');
 const signals:ParitySignal[]=[];
 const add=(kind:ParitySignalKind,description:string,evidenceIds:readonly string[]=[])=>{
  signals.push(Object.freeze({kind,description,evidenceIds:Object.freeze([...evidenceIds])}));
 };
 const category=legacy.recordedEtiCategory;
 const flag=legacy.legacyTherapyFlag;
 if(category==='unknown'||category===null)
  add('category-unknown','The original ETI classification is unknown or not recorded.');
 if((category==='responsive'&&flag===false)||
    (category==='non_responsive'&&flag===true))
  add('category-flag-disagreement','Original ETI classification differs from the separately recorded historical therapy flag.');
 if(!sourceRows.length)
  add('no-source-records','No source-specific rows were returned from this register. This does not establish absence of scientific evidence.');
 const etiRows=sourceRows.filter(row=>row.eti!==null);
 if(sourceRows.length&&!etiRows.length)
  add('no-source-eti-finding','Source-specific rows exist, but none records an ETI response.');
 const definitive=(x:RecordedModulatorResponse):x is 'responsive'|'non_responsive'=>
  x==='responsive'||x==='non_responsive';
 if(definitive(category)){
  const disagreed=etiRows.filter(row=>definitive(row.eti)&&row.eti!==category);
  if(disagreed.length)
   add('category-source-disagreement','An original source-specific ETI label differs from the variant-level ETI category.',
      disagreed.map(row=>row.id));
 }
 const positives=etiRows.filter(row=>row.eti==='responsive');
 const negatives=etiRows.filter(row=>row.eti==='non_responsive');
 if(positives.length&&negatives.length)
  add('source-source-disagreement','Source-specific ETI rows record differing response categories.',
   [...positives,...negatives].map(row=>row.id));
 const needsReview=signals.some(x=>[
  'category-flag-disagreement','category-source-disagreement','source-source-disagreement'
 ].includes(x.kind));
 const incomplete=signals.some(x=>[
  'category-unknown','no-source-records','no-source-eti-finding'
 ].includes(x.kind));
 return Object.freeze({
  variantId:legacy.id,sourceRecords:sourceRows.length,etiRecords:etiRows.length,
  signals:Object.freeze(signals),
  state:needsReview?'requires-review':incomplete?'incomplete':'aligned-recorded-fields'
 });
}
