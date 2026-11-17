import type {VariantEvidencePassport} from './variantEvidencePassport';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {CoreModulatorId} from './therapyRegistry';

/** 14H175–176: transparent research worklist, NOT automated scientific adjudication.
 * Each task is derived exclusively from the authenticated variant-scoped snapshot.
 */
export type TriageCategory='review-disagreement'|'scope-reconciliation'|'pending-peer-review'|
 'response-record-audit'|'source-verification'|'evidence-gap';
export type TriageBand='review-first'|'investigate'|'explore';
export interface EvidenceTriageTask {
 readonly id:string;
 readonly category:TriageCategory;
 readonly band:TriageBand;
 readonly therapy:CoreModulatorId|null;
 readonly referenceId:number|null;
 readonly claimIds:readonly string[];
 readonly title:string;
 readonly reason:string;
 readonly nextAction:string;
 readonly trace:string;
}
export interface EvidenceResearchPlan {
 readonly variantId:string;
 readonly tasks:readonly EvidenceTriageTask[];
 readonly reviewFirst:number;
 readonly investigate:number;
 readonly explore:number;
 readonly researchQuestions:readonly string[];
 readonly isClinicalRecommendation:false;
}
const priority:Record<TriageBand,number>={'review-first':0,investigate:1,explore:2};
export function buildEvidenceResearchPlan(
 passport:VariantEvidencePassport,claims:readonly CuratedSourceClaim[]
):EvidenceResearchPlan{
 if(!/^[1-9][0-9]{0,17}$/.test(passport.variantId)||
  claims.some(c=>c.variantId!==passport.variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length)
  throw new Error('Incompatible research prioritization snapshot');
 const referenceIds=new Set(passport.sources.map(s=>s.id));
 if(claims.some(c=>!referenceIds.has(c.referenceId)))
  throw new Error('Unlinked research claim in prioritization snapshot');
 const tasks:EvidenceTriageTask[]=[];
 const add=(task:EvidenceTriageTask)=>tasks.push(Object.freeze({
  ...task,claimIds:Object.freeze([...task.claimIds])
 }));
 for(const line of passport.therapies){
  const related=claims.filter(c=>c.therapy===line.therapy);
  const linked=(status:string)=>related.filter(c=>c.status===status).map(c=>c.id).sort();
  if(line.verificationState==='reviewed-conflict'||line.flaggedConflicts>0){
   add({id:'therapy:'+line.therapy+':disagreement',category:'review-disagreement',
    band:'review-first',therapy:line.therapy,referenceId:null,
    claimIds:linked('approved'),title:'Reconcile conflicting source observations',
    reason:'Reviewed reports or recorded response history disagree for this regimen.',
    nextAction:'Compare independent source claims, endpoints, study models and genotype scope.',
    trace:'Therapy '+line.therapy+' · '+line.flaggedConflicts+' recorded research flags'});
  }
  if(line.verificationState==='scope-not-reconciled'){
   add({id:'therapy:'+line.therapy+':scope',category:'scope-reconciliation',
    band:'review-first',therapy:line.therapy,referenceId:null,
    claimIds:linked('approved'),title:'Reconcile experimental or genotype scope',
    reason:'Reviewed findings cannot yet be transferred to the recorded variant-level context.',
    nextAction:'Inspect variant identity, second allele, model, endpoint and exact study population.',
    trace:'Therapy '+line.therapy+' · reviewed scope mismatch'});
  }
  const pending=linked('pending');
  if(pending.length){
   add({id:'therapy:'+line.therapy+':pending',category:'pending-peer-review',
    band:'review-first',therapy:line.therapy,referenceId:null,claimIds:pending,
    title:'Complete independent scientific review',
    reason:pending.length+' source claim revision(s) awaiting review; no unapproved claim is accepted as evidence.',
    nextAction:'Open the existing source review workflow; retain two independent reviewer attestations.',
    trace:'Therapy '+line.therapy+' · pending claim IDs'});
  }
  if(line.databaseLabel==='non_responsive'&&line.reviewedStudyFamilies===0){
   add({id:'therapy:'+line.therapy+':record-audit',category:'response-record-audit',
    band:'investigate',therapy:line.therapy,referenceId:null,claimIds:Object.freeze([]),
    title:'Audit the provenance of recorded non-response',
    reason:'The database records non-response without an independently reviewed study family in this register.',
    nextAction:'Locate the original source and distinguish experiment, genotype rule and historical catalogue label.',
    trace:'Therapy '+line.therapy+' · recorded category, not validated non-response'});
  }else if(line.reviewedStudyFamilies===0&&line.pendingClaims===0){
   add({id:'therapy:'+line.therapy+':gap',category:'evidence-gap',
    band:'explore',therapy:line.therapy,referenceId:null,claimIds:Object.freeze([]),
    title:'Investigate a source-register coverage gap',
    reason:'No independently reviewed study family is linked in the accessible register.',
    nextAction:'Search for source-specific studies; absence here is not evidence of biological non-response.',
    trace:'Therapy '+line.therapy+' · accessible register only'});
  }
 }
 for(const source of passport.sources){
  if(source.catalogueCheck==='recorded-pmid-aligned')continue;
  add({id:'source:'+source.id+':citation',category:'source-verification',
   band:'investigate',therapy:null,referenceId:source.id,claimIds:Object.freeze([]),
   title:'Verify publication identity',
   reason:source.catalogueCheck==='catalogue-pmid-conflict'?
    'Recorded PMID conflicts with the PubMed URL.':
    'The local record does not provide a mutually verified PubMed identifier.',
   nextAction:'Inspect the original citation and correct provenance through existing curation controls.',
   trace:'Source #'+source.id+' · '+source.catalogueCheck});
 }
 if(passport.authority.state==='identity-disagreement'){
  add({id:'authority:clinvar-identity',category:'source-verification',
   band:'review-first',therapy:null,referenceId:null,claimIds:Object.freeze([]),
   title:'Reconcile the official variation identifier',
   reason:'The externally returned variation record does not align with the stored identity.',
   nextAction:'Verify accession, exact HGVS nomenclature and source record; do not infer aliases.',
   trace:'ClinVar identity mismatch'});
 }
 const ordered=Object.freeze(tasks.sort((a,b)=>priority[a.band]-priority[b.band]||
  a.id.localeCompare(b.id)));
 const questions=Object.freeze([
  'Which variant-specific observations have independently reviewed source and exact genotype scope?',
  'Where do recorded drug labels disagree with observed experimental endpoints?',
  'Which unresolved claims require independent review or original-source verification?'
 ]);
 return Object.freeze({variantId:passport.variantId,tasks:ordered,
  reviewFirst:ordered.filter(t=>t.band==='review-first').length,
  investigate:ordered.filter(t=>t.band==='investigate').length,
  explore:ordered.filter(t=>t.band==='explore').length,
  researchQuestions:questions,isClinicalRecommendation:false as const});
}
