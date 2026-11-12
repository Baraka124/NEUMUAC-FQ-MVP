import type {CoreModulatorId,RecordedResponse} from './therapyRegistry';
import {hasExactF508delName,type NamedVariant,type RegimenRuleResult} from './legacyFiveRegimenRules';

/**
 * Read-only reproduction of review flags in the ORIGINAL monolithic
 * computeCompoundHetVerdict/MODULATOR_MAP (original index.html lines
 * 36887–36894, 36976–36982, 37204–37285).
 *
 * Flags are explanatory RESEARCH CONTEXT. They do not assert regulatory
 * eligibility, phased genotype, clinical response or a prescription.
 * Keep the five-regimen rule outcomes unchanged.
 */
export type PairReviewKind=
 'class-i-exceptional'|'eti-unrecorded'|'eti-record-disagreement'|
 'eti-non-f508-mdt'|'alyftrek-eti-review'|
 'alyftrek-eti-nonresponse'|'alyftrek-rule-only-match';
export interface PairReviewFinding {
 readonly kind:PairReviewKind;
 readonly therapy:CoreModulatorId|null;
 readonly message:string;
}
function response(v:NamedVariant,id:'ETI'|'ALYFTREK'):RecordedResponse{
 return v.profile.entries.find(e=>e.therapy===id)?.response??null;
}
const isUnknown=(value:RecordedResponse):boolean=>value===null||value==='unknown';
const isExceptional=(v:NamedVariant):boolean=>
 v.profile.functionalClass==='I'&&v.profile.classSubtype==='exceptional';
export function originalPairReviewFindings(
 first:NamedVariant,second:NamedVariant,outcomes:readonly RegimenRuleResult[]
):readonly PairReviewFinding[]{
 const flags:PairReviewFinding[]=[];
 const add=(kind:PairReviewKind,therapy:CoreModulatorId|null,message:string)=>{
  flags.push(Object.freeze({kind,therapy,message}));
 };
 const etiA=response(first,'ETI'),etiB=response(second,'ETI');
 const etiMatch=outcomes.find(r=>r.therapy==='ETI')?.outcome==='match';
 const alyftrekMatch=outcomes.find(r=>r.therapy==='ALYFTREK')?.outcome==='match';
 if(isExceptional(first)||isExceptional(second))
  add('class-i-exceptional',null,
   'A selected Class I record has an exceptional subtype. Preserve its recorded response and inspect the original evidence.');
 if(isUnknown(etiA)||isUnknown(etiB))
  add('eti-unrecorded',null,
   'At least one allele has an unknown or unrecorded ETI response. The original calculator flags this uncertainty.');
 if(etiA!==null&&etiB!==null&&etiA!==etiB)
  add('eti-record-disagreement',null,
   'The two selected alleles have different recorded ETI response categories. This is not an automatic reclassification.');
 if(etiMatch&&!hasExactF508delName(first)&&!hasExactF508delName(second))
  add('eti-non-f508-mdt','ETI',
   'Original ETI rule requires multidisciplinary review when neither selected allele is recorded as exact F508del.');
 if(alyftrekMatch&&(isUnknown(etiA)||isUnknown(etiB)||
  etiA==='non_responsive'||etiB==='non_responsive'))
  add('alyftrek-eti-review','ALYFTREK',
   'Original Alyftrek rule flags multidisciplinary review when ETI response is unknown or recorded non-responsive.');
 if(alyftrekMatch&&(etiA==='non_responsive'||etiB==='non_responsive'))
  add('alyftrek-eti-nonresponse','ALYFTREK',
   'A selected allele has a recorded ETI non-response. The original engine marks this as an Alyftrek expansion-review context.');
 if(alyftrekMatch&&!etiMatch)
  add('alyftrek-rule-only-match','ALYFTREK',
   'The Alyftrek research rule matched, but an ETI rule match was not established. This does not establish ETI ineligibility.');
 return Object.freeze(flags);
}
