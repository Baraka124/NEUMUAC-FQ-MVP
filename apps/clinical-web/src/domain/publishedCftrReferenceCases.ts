import type {CoreModulatorId} from './therapyRegistry';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** Phase 14H194: real, traceable publication *challenge cards*.
 * These are bibliographic anchors and expert-review questions, NOT
 * database claims, server-reviewed observations, machine-generated labels,
 * published effect estimates or clinical recommendations.
 *
 * The platform uses numeric internal catalogue IDs; HGVS and legacy labels
 * below are human-readable external case identities. Never invent an
 * internal variant ID or a source-claim approval for a publication.
 */
export interface PublishedReferenceCase {
 readonly id:string;
 readonly variantLabel:string;
 readonly aliases:readonly string[];
 readonly pmid:string;
 readonly doi:string;
 readonly pubmedUrl:string;
 readonly title:string;
 readonly therapy:CoreModulatorId|null;
 readonly researchFocus:'clinical-genotype-cohort'|'complex-allele-splicing';
 readonly requiredClaimScope:'genotype-specific'|null;
 readonly humanReviewQuestion:string;
 readonly nonInference:readonly string[];
 readonly publicationEvidenceState:'bibliography-verified-not-curated';
}
export const PUBLISHED_CFTR_REFERENCE_CASES:readonly PublishedReferenceCase[]=Object.freeze([
 Object.freeze({
  id:'g551d-ivacaftor-2011',variantLabel:'G551D',
  aliases:Object.freeze(['p.Gly551Asp','G551D']),
  pmid:'22047557',doi:'10.1056/NEJMoa1105185',
  pubmedUrl:'https://pubmed.ncbi.nlm.nih.gov/22047557/',
  title:'A CFTR potentiator in patients with cystic fibrosis and the G551D mutation',
  therapy:'IVACAFTOR' as const,researchFocus:'clinical-genotype-cohort' as const,
  requiredClaimScope:'genotype-specific' as const,
  humanReviewQuestion:'Does the extracted trial claim preserve its participants\' mutation-on-at-least-one-allele inclusion scope, endpoint, comparator and timepoint?',
  nonInference:Object.freeze([
   'The trial is not an isolated single-allele response assay',
   'A trial-level outcome does not classify every G551D-containing genotype or determine individual eligibility'
  ]),publicationEvidenceState:'bibliography-verified-not-curated' as const
 }),
 Object.freeze({
  id:'phe508del-mf-eti-2019',variantLabel:'Phe508del',
  aliases:Object.freeze(['F508del','p.Phe508del']),
  pmid:'31697873',doi:'10.1056/NEJMoa1908639',
  pubmedUrl:'https://pubmed.ncbi.nlm.nih.gov/31697873/',
  title:'Elexacaftor-Tezacaftor-Ivacaftor for Cystic Fibrosis with a Single Phe508del Allele',
  therapy:'ETI' as const,researchFocus:'clinical-genotype-cohort' as const,
  requiredClaimScope:'genotype-specific' as const,
  humanReviewQuestion:'Is this Phe508del–minimal-function cohort preserved without reinterpreting it as a single-variant effect or pooling incompatible study endpoints?',
  nonInference:Object.freeze([
   'The cohort contains Phe508del and a minimal-function allele',
   'Group-level benefit is not evidence of response of the minimal-function allele alone'
  ]),publicationEvidenceState:'bibliography-verified-not-curated' as const
 }),
 Object.freeze({
  id:'c1584ga-complex-allele-splicing-2020',variantLabel:'NM_000492.4:c.1584G>A',
  aliases:Object.freeze(['1716G/A','E528E','p.Glu528=','c.1584G>A']),
  pmid:'33375403',doi:'10.3390/life11010014',
  pubmedUrl:'https://pubmed.ncbi.nlm.nih.gov/33375403/',
  title:'The Effect of Synonymous Single-Nucleotide Polymorphisms on an Atypical Cystic Fibrosis Clinical Presentation',
  therapy:null,researchFocus:'complex-allele-splicing' as const,
  requiredClaimScope:null,
  humanReviewQuestion:'Are low-frequency aberrant splicing, the additional synonymous substitutions and patient-derived organoid context preserved without inventing modulator response?',
  nonInference:Object.freeze([
   'A synonymous variant can have source-reported RNA processing effects',
   'A complex allele cannot be reduced to a single isolated-variant causal verdict',
   'No ETI or Alyftrek response may be inferred from this publication'
  ]),publicationEvidenceState:'bibliography-verified-not-curated' as const
 })
]);

export interface ReferenceCaseInspection {
 readonly caseId:string;
 readonly expectedPublication:string;
 readonly linkedReferences:readonly number[];
 readonly reviewClaimIds:readonly string[];
 readonly matchedScopeClaimIds:readonly string[];
 readonly issues:readonly string[];
 readonly stage:'unlinked'|'bibliography-linked'|'source-claims-need-review'|'ready-for-expert-benchmark';
 readonly independentlyValidated:false;
 readonly clinicalDecision:false;
}

/** Phase 14H195: evaluate whether real-publication cases are *prepared*
 * for blinded human reference adjudication. This cannot certify scientific
 * correctness: bibliographic links and two software approvals are necessary
 * but insufficient for a gold-standard expert comparison.
 */
export function inspectPublishedCase(input:{
 caseId:string;variantId:string;
 references:readonly LiveEvidenceReference[];
 claims:readonly CuratedSourceClaim[];
}):ReferenceCaseInspection {
 const record=PUBLISHED_CFTR_REFERENCE_CASES.find(c=>c.id===input.caseId);
 if(!record)throw new Error('Unknown published CFTR challenge case');
 if(!/^[1-9][0-9]{0,17}$/.test(input.variantId)||
  input.references.length>200||input.claims.length>200||
  input.references.some(r=>r.variantId!==input.variantId)||
  input.claims.some(c=>c.variantId!==input.variantId)||
  new Set(input.references.map(r=>r.id)).size!==input.references.length||
  new Set(input.claims.map(c=>c.id)).size!==input.claims.length)
  throw new Error('Reference-case inspection requires a consistent exact-variant inventory');
 const matching=input.references.filter(r=>r.pmid===record.pmid&&
  r.url==='https://pubmed.ncbi.nlm.nih.gov/'+record.pmid+'/');
 const linked=new Set(matching.map(r=>r.id));
 const tied=input.claims.filter(c=>linked.has(c.referenceId)&&
  (record.therapy===null||c.therapy===record.therapy));
 const approved=tied.filter(c=>c.status==='approved');
 if(new Set(approved.map(c=>c.seriesId)).size!==approved.length||
  approved.some(c=>c.reviewCount!==2||c.reviewSeals.length!==2||
   c.reviewSeals[0]===c.reviewSeals[1]||!c.reviewedAt))
  throw new Error('Approved source claim lacks verified independent review');
 const scoped=approved.filter(c=>record.requiredClaimScope===null||
  c.scope===record.requiredClaimScope&&
  c.genotypePair!==null&&c.genotypePair.includes(input.variantId));
 const issues:string[]=[];
 if(!matching.length)issues.push('Original PubMed publication is not linked to this exact catalogue variant');
 if(!tied.length&&matching.length)issues.push('No structured source observations extracted from this publication');
 if(tied.length&&!approved.length)issues.push('Published observation still requires two independent source reviewers');
 if(record.requiredClaimScope&&approved.some(c=>c.scope!==record.requiredClaimScope))
  issues.push('Published genotype-cohort trial was incorrectly reduced to a single-variant claim');
 if(approved.length&&!scoped.length&&record.requiredClaimScope)
  issues.push('No independently reviewed claim preserves the tested two-allele genotype scope');
 if(record.therapy===null&&tied.length)
  issues.push('Non-treatment mechanism paper: therapy claims require separate modulator-specific primary evidence');
 const stage:ReferenceCaseInspection['stage']=!matching.length?'unlinked':
  !tied.length?'bibliography-linked':
  !approved.length||!scoped.length||issues.some(i=>i.includes('incorrectly')||i.includes('therapy claims'))?
   'source-claims-need-review':'ready-for-expert-benchmark';
 return Object.freeze({
  caseId:record.id,expectedPublication:record.pubmedUrl,
  linkedReferences:Object.freeze([...linked].sort((a,b)=>a-b)),
  reviewClaimIds:Object.freeze(approved.map(c=>c.id).sort()),
  matchedScopeClaimIds:Object.freeze(scoped.map(c=>c.id).sort()),
  issues:Object.freeze(issues),stage,
  independentlyValidated:false as const,clinicalDecision:false as const
 });
}
