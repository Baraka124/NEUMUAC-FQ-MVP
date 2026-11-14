import type {LiveEvidenceReference} from '../services/liveEvidence';

/**
 * 14H140 · Candidate recorded-source reconciliation, never a scientific verdict.
 *
 * DOI/PMID relationships are only assessed among records already retrieved on
 * the SAME visible page and attached to the SAME variant. Cross-page/global
 * coverage, independent review, actual publication identity, treatment
 * response and clinical quality CANNOT be concluded here.
 *
 * This function is pure, bounded by caller page size, and never writes records.
 */
export type ReconciliationField='title'|'doi'|'pmid'|'year'|'journal'|'type'|'category';
export type ReconciliationDifference='different-values'|'not-recorded-in-all';
export interface ReconciliationRecordedValue {
 readonly referenceId:number;
 readonly value:string|null;
}
export interface ReconciliationObservation {
 readonly field:ReconciliationField;
 readonly label:string;
 readonly kind:ReconciliationDifference;
 readonly values:readonly ReconciliationRecordedValue[];
}
export interface ReconciliationReference {
 readonly id:number;
 readonly title:string;
}
export interface EvidenceReconciliationGroup {
 readonly id:string;
 readonly variantId:string;
 readonly references:readonly ReconciliationReference[];
 readonly matchingIdentifiers:readonly string[];
 readonly observations:readonly ReconciliationObservation[];
}

const fields:readonly {field:ReconciliationField;label:string}[]=[
 {field:'doi',label:'DOI'},
 {field:'pmid',label:'PMID'},
 {field:'title',label:'Reference title'},
 {field:'year',label:'Publication year'},
 {field:'journal',label:'Journal'},
 {field:'type',label:'Recorded publication type'},
 {field:'category',label:'Recorded category'}
];

function recorded(entry:LiveEvidenceReference,field:ReconciliationField):string|null{
 const value=entry[field];
 return value===null||typeof value==='undefined'||String(value).trim()===''
  ?null:String(value).trim();
}
function normalized(value:string,field:ReconciliationField):string{
 const space=value.replace(/\s+/g,' ').trim();
 if(field==='doi')return space.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase();
 if(field==='pmid')return space;
 return space.toLocaleLowerCase('en-US');
}
function immutable<T>(items:readonly T[]):readonly T[]{return Object.freeze([...items]);}

export function evidenceReconciliationPage(
 page:readonly LiveEvidenceReference[]
):readonly EvidenceReconciliationGroup[]{
 if(page.length<2)return immutable([]);
 // Union only recorded DOI/PMID matches scoped to the same variant.
 // A repeated paper attached to two DIFFERENT variants is not a discrepancy.
 const parents=page.map((_,i)=>i);
 const root=(i:number):number=>{
  while(parents[i]!==i)i=parents[i];
  return i;
 };
 const firstByIdentifier=new Map<string,number>();
 for(let i=0;i<page.length;i++){
  const entry=page[i];
  for(const field of ['doi','pmid'] as const){
   const value=recorded(entry,field);
   if(!value)continue;
   const key=JSON.stringify([entry.variantId,field,normalized(value,field)]);
   const previous=firstByIdentifier.get(key);
   if(previous===undefined){firstByIdentifier.set(key,i);continue;}
   const firstRoot=root(previous),nextRoot=root(i);
   if(firstRoot!==nextRoot)parents[nextRoot]=firstRoot;
  }
 }
 const connected=new Map<number,LiveEvidenceReference[]>();
 for(let i=0;i<page.length;i++){
  const key=root(i);
  connected.set(key,[...(connected.get(key)??[]),page[i]]);
 }
 const results:EvidenceReconciliationGroup[]=[];
 for(const entries of connected.values()){
  if(entries.length<2)continue;
  const sorted=[...entries].sort((a,b)=>a.id-b.id);
  const variantId=sorted[0].variantId;
  const identifiers:string[]=[];
  for(const field of ['doi','pmid'] as const){
   const ids=new Map<string,{count:number;display:string}>();
   for(const entry of sorted){
    const value=recorded(entry,field);
    if(!value)continue;
    const key=normalized(value,field);
    const previous=ids.get(key);
    ids.set(key,{count:(previous?.count??0)+1,display:previous?.display??value});
   }
   for(const item of ids.values()){
    if(item.count>1)identifiers.push((field==='doi'?'DOI ':'PMID ')+item.display);
   }
  }
  const observations:ReconciliationObservation[]=[];
  for(const {field,label} of fields){
   const values=sorted.map(entry=>Object.freeze({
    referenceId:entry.id,value:recorded(entry,field)
   }));
   const unique=new Set(values.filter(x=>x.value!==null).map(x=>normalized(x.value!,field)));
   let kind:ReconciliationDifference|null=null;
   if(unique.size>1)kind='different-values';
   else if(unique.size===1&&values.some(x=>x.value===null))kind='not-recorded-in-all';
   if(kind)observations.push(Object.freeze({
    field,label,kind,values:immutable(values)
   }));
  }
  // Identical linked catalogue entries are already highlighted by the
  // original DOI/PMID repeat worklist; do not duplicate that workflow here.
  if(observations.length===0)continue;
  results.push(Object.freeze({
   id:variantId+':'+String(sorted[0].id),
   variantId,
   references:immutable(sorted.map(entry=>Object.freeze({id:entry.id,title:entry.title}))),
   matchingIdentifiers:immutable(identifiers),
   observations:immutable(observations)
  }));
 }
 return immutable(results.sort((a,b)=>
  Number(a.references[0].id)-Number(b.references[0].id)||
  a.variantId.localeCompare(b.variantId)));
}
