import {describe,expect,it} from 'vitest';
import {projectVariantTherapies,type RecordedResponse,type CoreModulatorId} from './therapyRegistry';
import {compareLegacyFiveRegimens,type NamedVariant,type RuleOutcome} from './legacyFiveRegimenRules';
import {classIReviewSignals} from './classIReviewSignals';

/** Independent expected outcomes manually transcribed from frozen index.1.html:
 * 36957–37087 (drug rules), 37936–38023 (pair classification).
 * A result is a historical rule match, never an approved indication.
 */
const ordered:CoreModulatorId[]=['ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'];
type V=[id:string,name:string,cls:string|null,subtype:string|null,eti:RecordedResponse,aly:RecordedResponse,etiTier:string|null,alyTier:string|null];
function variant([id,name,cls,subtype,eti,aly,etiTier,alyTier]:V):NamedVariant{
 return Object.freeze({id,names:Object.freeze([name]),profile:projectVariantTherapies({
  id,functionalClass:cls,classSubtype:subtype,eti,alyftrek:aly,validationCount:0,
  etiEvidenceTier:etiTier,alyftrekEvidenceTier:alyTier,
  etiEvidenceLevel:null,alyftrekEvidenceLevel:null,etiAuthority:null,alyftrekAuthority:null
 })});
}
const cases:readonly {name:string;first:V;second:V;expected:readonly RuleOutcome[]}[]=[
 {name:'F508del exactly twice',first:['101','F508del','II',null,'responsive','responsive','frt_assay',null],second:['102','p.Phe508del','II',null,'responsive','responsive','frt_assay',null],expected:['match','match','not-matched','match','match']},
 {name:'F508del and gating G551D',first:['101','F508del','II',null,'responsive','responsive','frt_assay',null],second:['103','G551D','III',null,'unknown','unknown',null,null],expected:['match','match','match','match','not-matched']},
 {name:'ivacaftor D110H positive / D110E negative',first:['104','D110H','IV',null,'unknown','unknown',null,null],second:['105','D110E','IV',null,'unknown','unknown',null,null],expected:['needs-evidence','match','match','not-matched','not-matched']},
 {name:'not F508del by substring',first:['106','F508del+G551D','II',null,'unknown','unknown',null,null],second:['101','F508del','II',null,'unknown','unknown',null,null],expected:['needs-evidence','match','not-matched','not-matched','not-matched']},
 {name:'Class II ETI class-rule matching',first:['107','variant-II','II',null,'responsive','unknown','class_rule',null],second:['19','G542X','I','exceptional','non_responsive','unknown',null,null],expected:['match','match','not-matched','not-matched','not-matched']},
 {name:'Class I Alyftrek direct clinical trial exception',first:['35','3120+1G>A','I','true','non_responsive','responsive',null,'clinical_trial'],second:['19','G542X','I','exceptional','non_responsive','unknown',null,null],expected:['needs-evidence','match','not-matched','not-matched','not-matched']},
 {name:'Exceptional E831X remains ETI-responsive, evidence unresolved',first:['1','E831X','I','exceptional','responsive','unknown',null,null],second:['19','G542X','I','exceptional','non_responsive','unknown',null,null],expected:['needs-evidence','not-matched','not-matched','not-matched','not-matched']},
 {name:'Missing class and missing therapies are unresolved',first:['108','unknown-variant',null,null,'unknown','unknown',null,null],second:['109','unknown-variant-2',null,null,null,null,null,null],expected:['needs-evidence','needs-evidence','not-matched','not-matched','not-matched']}
];
describe('14H18 independent frozen legacy differential matrix',()=>{
 for(const scenario of cases){
  it(scenario.name,()=>{
   const a=variant(scenario.first),b=variant(scenario.second);
   const snapshot=JSON.stringify([a,b]);
   const actual=compareLegacyFiveRegimens(a,b);
   expect(actual.map(x=>x.therapy)).toEqual(ordered);
   expect(actual.map(x=>x.outcome)).toEqual(scenario.expected);
   expect(JSON.stringify([a,b])).toBe(snapshot);
  });
 }
 it('stays source-exact on the Class I subtype and therapy divergences',()=>{
  const exceptions:[
   [string,'responsive'|'non_responsive','unknown'|'responsive',string]
  ]=[
   ['1','responsive','unknown','exceptional'],
   ['19','non_responsive','unknown','exceptional'],
   ['35','non_responsive','responsive','true'],
   ['86','non_responsive','responsive','true'],
   ['351','non_responsive','responsive','true']
  ];
  for(const [id,eti,aly,subtype] of exceptions){
   const p=variant([id,'Class-I-'+id,'I',subtype,eti,aly,null,null]).profile;
   expect(p.classSubtype).toBe(subtype);
   expect(p.entries[0].response).toBe(eti);
   expect(p.entries[1].response).toBe(aly);
   expect(p.entries.slice(2).every(x=>x.response===null)).toBe(true);
   if(aly==='responsive')expect(classIReviewSignals(p).map(x=>x.kind)).toContain('class-i-drug-divergence');
  }
 });
});
