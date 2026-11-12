import type {NamedVariant,RegimenRuleResult} from './legacyFiveRegimenRules';

/**
 * Original computeCompoundHetVerdict (owner-supplied index (85)(1).html,
 * lines 37201–37289) reconstructed as *descriptive* research metadata.
 *
 * The original "eligibility" output conflated rule matches with clinical
 * eligibility; here we deliberately call them RULE MATCHES. This layer
 * must never modify original entries or existing five-therapy outcomes.
 * The original class-rank descriptor is NOT an inference about clinical
 * severity or expression, and the two records are not a phased genotype.
 */
export interface OriginalPairVerdictContext {
 readonly originalClassOrderSelectedId:string;
 readonly originalEtiResponsiveRecordId:string|null;
 readonly bothSameClass:boolean;
 readonly classIDeclaredExceptional:boolean;
 readonly etiFirstUnrecorded:boolean;
 readonly etiSecondUnrecorded:boolean;
 readonly anyEtiUnrecorded:boolean;
 readonly etiValuesDiffer:boolean;
 readonly matchedRuleCount:number;
 readonly alyftrekOnlyRuleMatched:boolean;
 readonly alyftrekExpansionReview:boolean;
 readonly researchMatchHasEtiUncertainty:boolean;
}
const severityRank:Readonly<Record<string,number>>=Object.freeze({
 I:6,II:5,III:4,IV:3,V:2,VI:1
});
const rank=(v:NamedVariant):number=>severityRank[v.profile.functionalClass??'']??0;
const etiValue=(v:NamedVariant)=>
 v.profile.entries.find(x=>x.therapy==='ETI')?.response??null;
const originalUnknown=(value:string|null):boolean=>value===null||value==='unknown';

export function describeOriginalPairVerdict(
 first:NamedVariant,second:NamedVariant,rules:readonly RegimenRuleResult[]
):OriginalPairVerdictContext{
 const firstEti=etiValue(first),secondEti=etiValue(second);
 const etiFirstUnrecorded=originalUnknown(firstEti);
 const etiSecondUnrecorded=originalUnknown(secondEti);
 const matchedRuleCount=rules.filter(r=>r.outcome==='match').length;
 const alyftrekMatched=rules.some(r=>r.therapy==='ALYFTREK'&&r.outcome==='match');
 const etiMatched=rules.some(r=>r.therapy==='ETI'&&r.outcome==='match');
 return Object.freeze({
  originalClassOrderSelectedId:rank(first)>=rank(second)?first.id:second.id,
  originalEtiResponsiveRecordId:firstEti==='responsive'?first.id:
   secondEti==='responsive'?second.id:null,
  bothSameClass:Boolean(first.profile.functionalClass)&&
   first.profile.functionalClass===second.profile.functionalClass,
  classIDeclaredExceptional:[first,second].some(v=>
   v.profile.functionalClass==='I'&&v.profile.classSubtype==='exceptional'),
  etiFirstUnrecorded,etiSecondUnrecorded,
  anyEtiUnrecorded:etiFirstUnrecorded||etiSecondUnrecorded,
  etiValuesDiffer:Boolean(firstEti)&&Boolean(secondEti)&&firstEti!==secondEti,
  matchedRuleCount,
  alyftrekOnlyRuleMatched:alyftrekMatched&&!etiMatched,
  alyftrekExpansionReview:alyftrekMatched&&
   (firstEti==='non_responsive'||secondEti==='non_responsive'),
  researchMatchHasEtiUncertainty:(etiFirstUnrecorded||etiSecondUnrecorded)&&matchedRuleCount>0
 });
}
