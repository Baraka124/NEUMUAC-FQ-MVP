import type {LiveEvidenceReference} from '../services/liveEvidence';
import {referenceLinkConsistency} from './referencePresentation';

/**
 * 14H136 — On-page source curation, not evidence-quality scoring.
 *
 * Original HTML (index (85)(1).html, around lines 12865–12958)
 * inspected evidence contradictions; original validation submission
 * (around 19583–19700) checked historical conflicts and distinct peers.
 *
 * This intentionally SMALLER-SCOPE research worklist flags only observable
 * catalog consistency/metadata questions on the already retrieved page.
 * It must not infer study validity, drug response, clinical eligibility,
 * independent peer review, a global queue or a full-variant audit.
 */
export type EvidenceCurationKind =
 | 'identifier-mismatch'
 | 'same-variant-duplicate-doi'
 | 'same-variant-duplicate-pmid'
 | 'identifier-not-recorded'
 | 'year-not-recorded'
 | 'type-not-recorded';

export interface EvidenceCurationFinding {
 readonly referenceId:number;
 readonly variantId:string;
 readonly kind:EvidenceCurationKind;
 readonly label:string;
 readonly context:string;
 readonly category:'identifier-review'|'catalogue-metadata';
}

const meaningful=(value:string|null):string|null=>
 typeof value==='string'&&value.trim()?value.trim():null;
const doiKey=(value:string|null):string|null=>
 meaningful(value)?.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i,'').toLowerCase()??null;

export function evidenceCurationPageFindings(
 page:readonly LiveEvidenceReference[]
):readonly EvidenceCurationFinding[]{
 const findings:EvidenceCurationFinding[]=[];
 const add=(reference:LiveEvidenceReference,kind:EvidenceCurationKind,
  label:string,context:string,category:EvidenceCurationFinding['category'])=>
  findings.push(Object.freeze({referenceId:reference.id,variantId:reference.variantId,
   kind,label,context,category}));

 const dois=new Map<string,number[]>();
 const pmids=new Map<string,number[]>();
 for(const reference of page){
  const doi=doiKey(reference.doi);
  const pmid=meaningful(reference.pmid);
  if(doi){
   const key=reference.variantId+'|'+doi;
   dois.set(key,[...(dois.get(key)??[]),reference.id]);
  }
  if(pmid){
   const key=reference.variantId+'|'+pmid;
   pmids.set(key,[...(pmids.get(key)??[]),reference.id]);
  }
 }
 for(const reference of page){
  const consistency=referenceLinkConsistency(reference);
  if(consistency.kind==='mismatch')
   add(reference,'identifier-mismatch','Identifier mismatch',
    consistency.label+'; inspect the original source before proposing a correction.','identifier-review');
  if(doiKey(reference.doi)&&
     (dois.get(reference.variantId+'|'+doiKey(reference.doi))?.length??0)>1)
   add(reference,'same-variant-duplicate-doi','Repeated DOI on this page',
    'The same recorded DOI appears under different reference IDs for this variant on the current page. This may be legitimate; inspect both records.','identifier-review');
  if(meaningful(reference.pmid)&&
     (pmids.get(reference.variantId+'|'+meaningful(reference.pmid))?.length??0)>1)
   add(reference,'same-variant-duplicate-pmid','Repeated PMID on this page',
    'The same recorded PMID appears under different reference IDs for this variant on the current page. This is a comparison prompt, not proof of duplication.','identifier-review');
  if(!meaningful(reference.doi)&&!meaningful(reference.pmid))
   add(reference,'identifier-not-recorded','DOI / PMID not recorded',
    'No DOI or PMID is recorded for this entry. Some source types do not have these identifiers; inspect source identity if relevant.','catalogue-metadata');
  if(reference.year===null)
   add(reference,'year-not-recorded','Publication year not recorded',
    'The catalogue lacks a year. Do not infer recency from display position.','catalogue-metadata');
  if(!meaningful(reference.type))
   add(reference,'type-not-recorded','Publication type not recorded',
    'The catalogue lacks a publication-type field; do not infer study design from its title.','catalogue-metadata');
 }
 return Object.freeze(findings);
}
