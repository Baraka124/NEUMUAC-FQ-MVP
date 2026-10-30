import {THERAPIES,type CoreModulatorId,type VariantTherapyProfile} from './therapyRegistry';

/** Frozen legacy candidate logic (index.1.html, MODULATOR_MAP and
 * computeCompoundHetVerdict). This returns rule MATCHES, not prescribing
 * eligibility; source-labelled approval and individual genotype phase are not
 * established by two selected variant records.
 */
export interface NamedVariant {
 readonly id:string;
 readonly names:readonly (string|null)[];
 readonly profile:VariantTherapyProfile;
}
export type RuleOutcome='match'|'not-matched'|'needs-evidence';
export interface RegimenRuleResult {
 readonly therapy:CoreModulatorId;
 readonly outcome:RuleOutcome;
 readonly rationale:string;
 readonly basis:'variant-tier'|'legacy-name-list'|'legacy-class-rule'|'missing-evidence';
}
const ivacaftorLegacyNames=Object.freeze([
 'G551D','G1244E','G1349D','G178R','G551S','S1251N','S1255P','S549N','S549R',
 'R117H','p.Arg117His','E56K','P67L','R74W','D110H','R117C','L206W',
 'R347H','R352Q','A455E','S977F','F1052V','K1060T','A1067T','G1069R',
 'R1070Q','R1070W','F1074L','D1152H','G970R','D579G'
]);
const ivaNames=new Set(ivacaftorLegacyNames.map(s=>s.toUpperCase()));
function recordedNames(v:NamedVariant):readonly string[]{
 return v.names.filter((n):n is string=>typeof n==='string'&&!!n.trim()).map(n=>n.trim().toUpperCase());
}
function isF508(v:NamedVariant):boolean{
 return recordedNames(v).some(s=>s==='F508DEL'||s==='P.PHE508DEL'||s==='C.1521_1523DEL');
}
function ivaMatch(v:NamedVariant):boolean{
 return recordedNames(v).some(n=>ivaNames.has(n));
}
function entry(v:NamedVariant,id:CoreModulatorId){
 return v.profile.entries.find(e=>e.therapy===id);
}
function result(therapy:CoreModulatorId,outcome:RuleOutcome,rationale:string,basis:RegimenRuleResult['basis']):RegimenRuleResult{
 return Object.freeze({therapy,outcome,rationale,basis});
}
/** At most one pair-rule match per catalog regimen. Never infer negatives from
 * a missing evidence tier or an unresolved authority-label list.
 */
export function compareLegacyFiveRegimens(first:NamedVariant,second:NamedVariant):readonly RegimenRuleResult[]{
 if(!first||!second||!first.profile||!second.profile||
    first.profile.variantId!==first.id||second.profile.variantId!==second.id||
    !/^[1-9]\d{0,17}$/.test(first.id)||!/^[1-9]\d{0,17}$/.test(second.id))
  throw new Error('Invalid variant pair');
 const pair=[first,second];
 const etiStrong=pair.some(v=>{
  const e=entry(v,'ETI');
  return e?.response==='responsive'&&['clinical_trial','frt_assay','fda_approved'].includes(e.evidenceTier??'');
 });
 const etiClass=pair.some(v=>{
  const e=entry(v,'ETI');
  return v.profile.functionalClass==='II'&&e?.response==='responsive'&&e.evidenceTier==='class_rule';
 });
 const etiRecorded=pair.some(v=>entry(v,'ETI')?.response==='responsive');
 const alyTrial=pair.some(v=>{
  const e=entry(v,'ALYFTREK');
  return e?.response==='responsive'&&e.evidenceTier==='clinical_trial';
 });
 const classKnown=pair.some(v=>Boolean(v.profile.functionalClass));
 const bothClassI=pair.every(v=>v.profile.functionalClass==='I');
 const bothF508=pair.every(isF508);
 const f508Iva=(isF508(first)&&ivaMatch(second))||(isF508(second)&&ivaMatch(first));
 const outcome:RegimenRuleResult[]=[
  etiStrong?
   result('ETI','match','A recorded ETI response has an original direct-evidence tier.','variant-tier'):
   etiClass?
   result('ETI','match','A Class II record matches the original class-rule tier.','legacy-class-rule'):
   result('ETI','needs-evidence',etiRecorded?'Recorded ETI response lacks a qualifying source tier; check the original label list.':'Original named-label matching and evidence remain to be verified.','missing-evidence'),
  alyTrial?
   result('ALYFTREK','match','A recorded Alyftrek response has a clinical-trial tier.','variant-tier'):
   !classKnown?
   result('ALYFTREK','needs-evidence','Functional class information is missing.','missing-evidence'):
   !bothClassI?
   result('ALYFTREK','match','The original broad non-Class-I rule matches this pair; confirm current regulatory criteria.','legacy-class-rule'):
   result('ALYFTREK','not-matched','Both records are Class I without a recorded trial-tier exception.','legacy-class-rule'),
  ivaMatch(first)||ivaMatch(second)?
   result('IVACAFTOR','match','At least one recorded name matches the original ivacaftor variant list.','legacy-name-list'):
   result('IVACAFTOR','not-matched','No exact match in the original ivacaftor name list.','legacy-name-list'),
  bothF508||f508Iva?
   result('TEZACAFTOR_IVACAFTOR','match',bothF508?'Both records have exact F508del names.':'Exact F508del name plus a recorded ivacaftor-list name.','legacy-name-list'):
   result('TEZACAFTOR_IVACAFTOR','not-matched','The exact F508del pair/list rule is not matched.','legacy-name-list'),
  bothF508?
   result('LUMACAFTOR_IVACAFTOR','match','Both records have exact F508del names.','legacy-name-list'):
   result('LUMACAFTOR_IVACAFTOR','not-matched','The original rule requires two exact F508del records.','legacy-name-list')
 ];
 if(outcome.length!==THERAPIES.length)throw new Error('Incomplete regimen coverage');
 return Object.freeze(outcome);
}
