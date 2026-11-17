import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {molecularProvenancePath} from './researchReviewQueue';

export type QualityFlagCode=
 'unlinked-publication'|'source-review-pending'|'source-review-incomplete'|
 'molecular-review-pending'|'molecular-source-unverified'|
 'molecular-hypothesis'|'molecular-uncertain'|
 'shared-study-family'|'source-findings-differ'|'molecular-interpretations-differ'|
 'endpoint-unextracted'|'study-identity-unextracted';
export type QualitySeverity='information'|'review-needed'|'provenance-blocked';
export interface EvidenceQualityFlag{
 readonly code:QualityFlagCode;
 readonly severity:QualitySeverity;
 readonly title:string;
 readonly explanation:string;
 readonly recordIds:readonly string[];
 readonly sourceClaimId:string|null;
}
/** Source-inventory triage, not an adjudication algorithm or clinical score.
 * In particular, different findings or molecular interpretations are
 * research review questions, never proof of biological disagreement.
 */
export function assessScientificEvidenceQuality(input:{
 variantId:string;
 claims:readonly CuratedSourceClaim[];
 mechanisms:readonly MolecularReviewRecord[];
 references:readonly LiveEvidenceReference[];
}):readonly EvidenceQualityFlag[]{
 const {variantId,claims,mechanisms,references}=input;
 if(!/^[1-9][0-9]{0,17}$/.test(variantId)||claims.length>200||
  mechanisms.length>200||references.length>200||
  claims.some(c=>c.variantId!==variantId)||
  mechanisms.some(m=>m.variantId!==variantId)||
  references.some(r=>r.variantId!==variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(mechanisms.map(m=>m.id)).size!==mechanisms.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Quality review requires an exact, nonduplicated variant register');
 const flags:EvidenceQualityFlag[]=[];
 const add=(code:QualityFlagCode,severity:QualitySeverity,title:string,
  explanation:string,recordIds:readonly string[],sourceClaimId:string|null=null):void=>{
  flags.push(Object.freeze({
   code,severity,title,explanation,recordIds:Object.freeze([...recordIds]),sourceClaimId
  }));
 };
 const active=claims.filter(c=>c.status==='approved'||c.status==='pending');
 const refIds=new Set(references.map(r=>r.id));
 for(const claim of active){
  if(!refIds.has(claim.referenceId))
   add('unlinked-publication','provenance-blocked','Original publication not linked',
    'The referenced publication is not present in the verified bibliography for this exact variant.',
    [claim.id],claim.id);
  if(claim.status==='pending')
   add('source-review-pending','review-needed','Source claim awaiting scientific review',
    'One or both independent source reviews have not been completed.',
    [claim.id],claim.id);
  if(claim.status==='approved'&&(
   claim.reviewCount!==2||claim.reviewSeals.length!==2||
   claim.reviewSeals[0]===claim.reviewSeals[1]||!claim.reviewedAt))
   add('source-review-incomplete','provenance-blocked','Source approval not independently verifiable',
    'The source-claim record does not provide two distinct review seals and completion date.',
    [claim.id],claim.id);
  if(claim.endpoint?.code==='not-reported'||!claim.endpoint)
   add('endpoint-unextracted','information','Experimental endpoint not extracted',
    'The endpoint is unreported in the register; this is not evidence the publication lacks measurements.',
    [claim.id],claim.id);
  if(claim.studyIdentity?.populationModel==='not-reported'||!claim.studyIdentity)
   add('study-identity-unextracted','information','Population or model not extracted',
    'The underlying study population or biological model has not been recorded in structured form.',
    [claim.id],claim.id);
 }
 // Count genuinely distinct source claims within the same study family,
 // rather than treating each publication as independent.
 const families=new Map<string,CuratedSourceClaim[]>();
 for(const claim of active){
  const group=families.get(claim.studyFamilyId)??[];
  group.push(claim);families.set(claim.studyFamilyId,group);
 }
 for(const [family,rows] of families){
  if(rows.length<2)continue;
  add('shared-study-family','review-needed','Multiple claims share a study family',
   'Claims with study family '+family+' must not automatically be counted as independent experiments.',
   rows.map(c=>c.id));
  for(const therapy of new Set(rows.map(c=>c.therapy))){
   const therapyRows=rows.filter(c=>c.therapy===therapy&&c.status==='approved');
   if(therapyRows.length>1&&new Set(therapyRows.map(c=>c.finding)).size>1)
    add('source-findings-differ','review-needed','Different reported findings need context review',
     'Independently reviewed claims under the same study family and therapy have different recorded finding labels. Check genotype scope, endpoint, model, timepoint and study overlap before any interpretation.',
     therapyRows.map(c=>c.id));
  }
 }
 for(const mechanism of mechanisms){
  if(mechanism.status==='pending')
   add('molecular-review-pending','review-needed','Molecular interpretation awaiting independent reviews',
    'An explicit molecular interpretation is a proposal until two distinct scientific reviewers approve it.',
    [mechanism.id],mechanism.sourceClaimId);
  if(mechanism.status!=='pending'&&mechanism.status!=='approved')continue;
  const path=molecularProvenancePath({mechanism,claims,references});
  if(!path.sourceReady)
   add('molecular-source-unverified','provenance-blocked','Molecular proposal lacks a currently approved source chain',
    'The original source claim or linked bibliography cannot currently support an approved provenance chain.',
    [mechanism.id],mechanism.sourceClaimId);
  if(mechanism.interpretation==='mechanistic-hypothesis')
   add('molecular-hypothesis','information','Mechanistic hypothesis, not demonstrated causation',
    'Scientific approval of this interpretation preserves the source author\'s hypothesis status; it does not establish molecular causality.',
    [mechanism.id],mechanism.sourceClaimId);
  if(mechanism.interpretation==='contradictory-or-uncertain')
   add('molecular-uncertain','review-needed','Uncertain molecular interpretation',
    'The interpretation was explicitly recorded as contradictory or uncertain; adjudication cannot turn uncertainty into established response.',
    [mechanism.id],mechanism.sourceClaimId);
 }
 // A label clash is a question for reviewers, not a computed biological contradiction.
 const approvedMolecules=mechanisms.filter(m=>
  m.status==='approved'&&molecularProvenancePath({mechanism:m,claims,references})
   .mechanismApprovedAndLinked);
 for(let i=0;i<approvedMolecules.length;i++){
  const first=approvedMolecules[i]!;
  for(let j=i+1;j<approvedMolecules.length;j++){
   const second=approvedMolecules[j]!;
   if(first.sourceClaimId===second.sourceClaimId&&
    first.interpretation!==second.interpretation&&
    first.categories.some(c=>second.categories.includes(c)))
    add('molecular-interpretations-differ','review-needed',
     'Different interpretations of the same approved source',
     'Distinct independently reviewed records share a source and mechanism category but have different interpretation types. Inspect assay-specific context and limitations; they are not automatically contradictory.',
     [first.id,second.id],first.sourceClaimId);
  }
 }
 return Object.freeze(flags);
}

export type ReviewChecklistKey='original-publication'|'variant-and-genotype'|
 'study-independence'|'experimental-context'|'interpretation-limits';
export const REVIEW_CHECKLIST=[
 {id:'original-publication',label:'Original publication and exact locator examined'},
 {id:'variant-and-genotype',label:'Exact CFTR variant and tested genotype checked'},
 {id:'study-independence',label:'Study family and potential duplicate cohorts checked'},
 {id:'experimental-context',label:'Assay, endpoint, comparator and experimental model checked'},
 {id:'interpretation-limits',label:'Uncertainty, limitations and interpretation strength checked'}
] as const;
export function reviewChecklistComplete(checks:Readonly<Record<ReviewChecklistKey,boolean>>):boolean{
 return REVIEW_CHECKLIST.every(c=>checks[c.id]===true);
}
/** Local reviewer preparation only. Server role checks and independent
 * reviewer identity are never established by this client-side checklist. */
export function reviewChecklistInitial():Record<ReviewChecklistKey,boolean>{
 return {
  'original-publication':false,'variant-and-genotype':false,
  'study-independence':false,'experimental-context':false,
  'interpretation-limits':false
 };
}
