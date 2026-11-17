import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';

/** Explicit, researcher-entered source interpretation. Never infer a
 * molecular defect from CFTR class, a pharmacological response category,
 * an endpoint, or the title of a publication.
 *
 * No persistence is implied. Mechanism interpretation must undergo its own
 * independent review before becoming a validated scientific annotation.
 */
export const MECHANISM_CATEGORIES=[
 {id:'rna-splicing',label:'RNA splicing / transcript processing'},
 {id:'protein-synthesis',label:'Protein synthesis / abundance'},
 {id:'protein-folding',label:'Folding / maturation'},
 {id:'trafficking',label:'Cell-surface trafficking'},
 {id:'channel-gating',label:'Channel gating / open probability'},
 {id:'conductance',label:'Channel conductance'},
 {id:'stability',label:'Membrane stability / turnover'},
 {id:'other',label:'Other directly reported mechanism'}
] as const;
export type MechanismCategory=typeof MECHANISM_CATEGORIES[number]['id'];
export type MechanismInterpretation='reported-observation'|'mechanistic-hypothesis'|'contradictory-or-uncertain';
export interface MechanismAnnotationDraft{
 readonly variantId:string;
 readonly claimId:string;
 readonly referenceId:number;
 readonly sourceUrl:string;
 readonly sourceTitle:string;
 readonly studyFamilyId:string;
 readonly categories:readonly MechanismCategory[];
 readonly interpretation:MechanismInterpretation;
 readonly statement:string;
 readonly exactLocator:string;
 readonly experimentalContext:string;
 readonly limitations:string;
 readonly validationState:'unreviewed-research-draft';
 readonly clinicalDecisionProvided:false;
}
const canonical=/^[1-9][0-9]{0,17}$/;
const controls=/[\u0000-\u001f\u007f]/;
const text=(value:string,min:number,max:number):boolean=>
 typeof value==='string'&&value===value.trim()&&value.length>=min&&value.length<=max&&!controls.test(value);
export function prepareMechanismAnnotationDraft(input:{
 variantId:string;claimId:string;
 categories:readonly MechanismCategory[];
 interpretation:MechanismInterpretation;
 statement:string;exactLocator:string;experimentalContext:string;limitations:string;
},claims:readonly CuratedSourceClaim[],references:readonly LiveEvidenceReference[]):MechanismAnnotationDraft{
 if(!canonical.test(input.variantId)||claims.length>200||references.length>200||
  claims.some(c=>c.variantId!==input.variantId)||
  references.some(r=>r.variantId!==input.variantId)||
  new Set(claims.map(c=>c.id)).size!==claims.length||
  new Set(references.map(r=>r.id)).size!==references.length)
  throw new Error('Invalid or incomplete molecular-evidence source context');
 const selected=claims.find(c=>c.id===input.claimId);
 const source=references.find(r=>r.id===selected?.referenceId);
 if(!selected||!source||selected.status!=='approved'||selected.reviewCount!==2||
  selected.reviewSeals.length!==2||selected.reviewSeals[0]===selected.reviewSeals[1]||
  !selected.reviewedAt)throw new Error('An independently reviewed linked source claim is required');
 const allowed=new Set<string>(MECHANISM_CATEGORIES.map(c=>c.id));
 if(!input.categories.length||input.categories.length>5||
  new Set(input.categories).size!==input.categories.length||
  input.categories.some(x=>!allowed.has(x))||
  !['reported-observation','mechanistic-hypothesis','contradictory-or-uncertain'].includes(input.interpretation)||
  !text(input.statement,25,850)||
  !text(input.exactLocator,8,240)||
  !text(input.experimentalContext,15,350)||
  !text(input.limitations,20,500))
  throw new Error('Incomplete source-reported mechanism annotation');
 return Object.freeze({
  variantId:input.variantId,claimId:selected.id,referenceId:source.id,
  sourceUrl:source.url,sourceTitle:source.title,
  studyFamilyId:selected.studyFamilyId,
  categories:Object.freeze([...input.categories]),
  interpretation:input.interpretation,statement:input.statement,
  exactLocator:input.exactLocator,experimentalContext:input.experimentalContext,
  limitations:input.limitations,
  validationState:'unreviewed-research-draft' as const,
  clinicalDecisionProvided:false as const
 });
}
export function portableMechanismDraft(value:MechanismAnnotationDraft):string{
 return JSON.stringify({
  ...value,kind:'nfq-mechanism-interpretation-proposal-v1',
  reviewRequired:'separate-independent-scientific-adjudication',
  disclaimer:'The linked source claim approval does not validate this proposed mechanism.'
 },null,2);
}
