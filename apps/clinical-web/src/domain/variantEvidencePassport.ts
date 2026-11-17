import type {MultiTherapyResearchReport,ResearchAssessmentState} from './multiTherapyResearch';
import type {CoreModulatorId,RecordedResponse} from './therapyRegistry';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {ClinVarAuthoritySummary} from '../services/liveClinVar';
import {clinVarVariationUrl} from './externalAuthority';

/** Independent verification dimensions are deliberately NOT one score.
 * ClinVar clinical significance, CFTR protein mechanism, source-reported
 * pharmacological response and regulator-defined eligibility differ.
 */
export type AuthorityCheckState='not-linked'|'not-checked'|'verified-identity'|
 'unavailable'|'identity-disagreement';
export type NameAlignment='recorded-notation-aligned'|'unconfirmed'|'not-checkable';
export type VerificationState='reviewed-response-report'|'reviewed-no-response-report'|
 'reviewed-conflict'|'scope-not-reconciled'|'recorded-history-only'|
 'no-reviewed-observation-in-register';
export interface PassportIdentity {
 readonly legacyName:string|null;
 readonly proteinName:string|null;
 readonly cdnaName:string|null;
 readonly aliases:readonly string[];
 readonly functionalClass:string|null;
 readonly classSubtype:string|null;
 readonly clinVarId:string|null;
}
export interface PassportAuthority {
 readonly state:AuthorityCheckState;
 readonly alignment:NameAlignment;
 readonly classification:string|null;
 readonly reviewStatus:string|null;
 readonly lastEvaluated:string|null;
 readonly citationUrl:string|null;
 readonly retrievedAt:string|null;
 readonly title:string|null;
 readonly note:string;
}
export interface PassportTherapyLine {
 readonly therapy:CoreModulatorId;
 readonly coverage:'variant-recorded'|'genotype-context-only';
 readonly databaseLabel:RecordedResponse;
 readonly verificationState:VerificationState;
 readonly reviewedStudyFamilies:number;
 readonly reviewedSourceReferences:readonly number[];
 readonly pendingClaims:number;
 readonly flaggedConflicts:number;
 readonly provenanceNote:string;
 readonly actionNeeded:boolean;
}
export interface PassportSource {
 readonly id:number;
 readonly title:string;
 readonly url:string;
 readonly pmid:string|null;
 readonly doi:string|null;
 readonly indexingPmid:string|null;
 readonly catalogueCheck:'recorded-pmid-aligned'|'catalogue-pmid-missing'|
 'catalogue-pmid-conflict'|'not-pubmed-indexed';
 readonly approvedClaimCount:number;
 readonly pendingClaimCount:number;
}
export interface VariantEvidencePassport {
 readonly variantId:string;
 readonly variantName:string;
 readonly identity:PassportIdentity;
 readonly authority:PassportAuthority;
 readonly therapies:readonly PassportTherapyLine[];
 readonly sources:readonly PassportSource[];
 readonly approvedClaims:number;
 readonly pendingClaims:number;
 readonly responseRecordConflictCount:number;
 readonly unresolvedTherapies:number;
 readonly overallInterpretation:'verification-unavailable'|'source-disagreement'|
  'review-work-needed'|'research-source-reports-present';
 readonly limitations:readonly string[];
}
function exactRecordedNotationInTitle(recorded:string,externalTitle:string):boolean{
 const a=recorded.normalize('NFKC').trim().toLowerCase();
 const b=externalTitle.normalize('NFKC').toLowerCase();
 if(a.length<5||a.length>120)return false;
 let start=b.indexOf(a);
 while(start>=0){
  const before=start===0?'':b[start-1];
  const after=b[start+a.length]??'';
  // This avoids confusing e.g. c.1584G>A with c.1584G>AG,
  // or a splice junction token that merely shares a prefix.
  if(!/[a-z0-9]/i.test(before)&&!/[a-z0-9]/i.test(after))return true;
  start=b.indexOf(a,start+1);
 }
 return false;
}
function authorityId(raw:string|null):string|null{
 const url=clinVarVariationUrl(raw);
 if(!url)return null;
 const match=url.match(/\/variation\/(\d+|VCV\d{9}(?:\.\d+)?)\//i)?.[1];
 if(!match)return null;
 const digits=match.toUpperCase().startsWith('VCV')?
  match.slice(3).split('.')[0]:match;
 const id=String(Number(digits));
 return id!=='0'&&Number.isSafeInteger(Number(digits))?id:null;
}
export function comparePassportAuthority(
 clinVarId:string|null,authority:ClinVarAuthoritySummary|null,
 attempt:'unchecked'|'failed'|'checked'
):PassportAuthority{
 const expected=authorityId(clinVarId);
 if(!expected){
  return Object.freeze({state:'not-linked',alignment:'not-checkable',
   classification:null,reviewStatus:null,lastEvaluated:null,
   citationUrl:null,retrievedAt:null,title:null,
   note:'No supported ClinVar variation identifier is recorded. A name search cannot establish record identity.'
  });
 }
 if(!authority){
  return Object.freeze({state:attempt==='failed'?'unavailable':'not-checked',
   alignment:'not-checkable',classification:null,reviewStatus:null,lastEvaluated:null,
   citationUrl:clinVarVariationUrl(clinVarId),retrievedAt:null,title:null,
   note:attempt==='failed'?
    'External verification unavailable; no conclusion about the existence or absence of evidence is possible.':
    'ClinVar not checked during this session. The database class is not an external pathogenicity verdict.'
  });
 }
 const match=authority.variationId===expected&&authority.accession.startsWith('VCV');
 return Object.freeze({
  state:match?'verified-identity':'identity-disagreement',
  alignment:'not-checkable',classification:match?authority.germlineDescription:null,
  reviewStatus:match?authority.reviewStatus:null,
  lastEvaluated:match?authority.lastEvaluated:null,
  citationUrl:match?authority.sourceUrl:clinVarVariationUrl(clinVarId),
  retrievedAt:match?authority.retrievedAt:null,
  title:match?authority.title:null,
  note:match?
   'Official ClinVar variation ID and CFTR gene indexing were verified. This does not validate protein class, therapy response or regulatory eligibility.':
   'The external variation identifier does not match this variant record. Do not transfer classifications.'
 });
}
export function assessPassportReference(ref:LiveEvidenceReference):PassportSource{
 const url=new URL(ref.url);
 const fromUrl=url.hostname==='pubmed.ncbi.nlm.nih.gov'?
  url.pathname.match(/^\/([1-9][0-9]{0,11})\/?$/)?.[1]??null:null;
 const catalogueValid=ref.pmid!==null&&/^[1-9][0-9]{0,11}$/.test(ref.pmid);
 const status:PassportSource['catalogueCheck']=fromUrl?
  !ref.pmid?'catalogue-pmid-missing':
  catalogueValid&&fromUrl===ref.pmid?'recorded-pmid-aligned':'catalogue-pmid-conflict':
  'not-pubmed-indexed';
 return Object.freeze({
  id:ref.id,title:ref.title,url:ref.url,pmid:ref.pmid,doi:ref.doi,
  indexingPmid:fromUrl===ref.pmid&&catalogueValid?fromUrl:null,
  catalogueCheck:status,approvedClaimCount:0,pendingClaimCount:0
 });
}
export function evaluateVariantEvidencePassport(input:{
 readonly variantId:string;
 readonly variantName:string;
 readonly identity:PassportIdentity;
 readonly report:MultiTherapyResearchReport;
 readonly references:readonly LiveEvidenceReference[];
 readonly claims:readonly CuratedSourceClaim[];
 readonly clinVarSummary:ClinVarAuthoritySummary|null;
 readonly authorityAttempt:'unchecked'|'failed'|'checked';
}):VariantEvidencePassport{
 const {variantId,report,references,claims}=input;
 if(!/^[1-9][0-9]{0,17}$/.test(variantId)||
  report.variantId!==variantId||report.assessedTherapies.length!==5||
  references.length>200||claims.length>1000||
  references.some(x=>x.variantId!==variantId)||
  claims.some(x=>x.variantId!==variantId)||
  new Set(references.map(x=>x.id)).size!==references.length)
  throw new Error('Incompatible variant verification snapshot');
 const allowed=new Set(references.map(x=>x.id));
 if(claims.some(x=>!allowed.has(x.referenceId)))
  throw new Error('Research claim has no currently linked source');
 const sources=references.map(ref=>{
  const base=assessPassportReference(ref);
  return Object.freeze({
   ...base,
   approvedClaimCount:claims.filter(x=>x.referenceId===ref.id&&x.status==='approved').length,
   pendingClaimCount:claims.filter(x=>x.referenceId===ref.id&&x.status==='pending').length
  });
 });
 const therapies=report.assessedTherapies.map(item=>{
  const approved=claims.filter(x=>x.status==='approved'&&x.therapy===item.therapy);
  const pending=claims.filter(x=>x.status==='pending'&&x.therapy===item.therapy);
  const approvedRefs=[...new Set(approved.map(x=>x.referenceId))].sort((a,b)=>a-b);
  const sourceState:ResearchAssessmentState=item.state;
  const verificationState:VerificationState=sourceState==='review-conflict'?
   'reviewed-conflict':sourceState==='review-scope-uncertain'?
   'scope-not-reconciled':sourceState==='reviewed-response-report'?
   'reviewed-response-report':sourceState==='reviewed-no-response-report'?
   'reviewed-no-response-report':sourceState==='archived-records-only'?
   'recorded-history-only':'no-reviewed-observation-in-register';
  const coverage=item.therapy==='ETI'||item.therapy==='ALYFTREK'?
   'variant-recorded' as const:'genotype-context-only' as const;
  const flag=verificationState==='reviewed-conflict'||
   verificationState==='scope-not-reconciled'||
   item.archiveDisagreesWithRecorded||item.sourceAssessment.pendingObservations>0;
  const provenanceNote=verificationState==='no-reviewed-observation-in-register'||
   verificationState==='recorded-history-only'?
   item.recordedResponse==='non_responsive'?
    'Recorded non-response is not independently confirmed; no reviewed response study in this accessible source register.':
    'No independently reviewed variant-specific response observation in this accessible source register. Not proof of biological non-response.':
   verificationState==='reviewed-conflict'?
    'Source findings disagree; specialist review is necessary. Database response remains unchanged.':
   verificationState==='scope-not-reconciled'?
    'Source genotype, model or experimental context is not directly transferable to this recorded variant response.':
   'Independently reviewed publication observations exist; clinical efficacy and individual eligibility are not established.';
  return Object.freeze({
   therapy:item.therapy,
   coverage,databaseLabel:item.recordedResponse,verificationState,
   reviewedStudyFamilies:item.sourceAssessment.verifiedStudyFamilies,
   reviewedSourceReferences:Object.freeze(approvedRefs),
   pendingClaims:pending.length,flaggedConflicts:item.conflicts.length,
   provenanceNote,actionNeeded:flag||approved.length===0
  });
 });
 const authority=comparePassportAuthority(
  input.identity.clinVarId,input.clinVarSummary,input.authorityAttempt
 );
 const recordedNotations=[input.identity.cdnaName,input.identity.proteinName].filter(
  (v):v is string=>typeof v==='string'&&v.trim().length>0
 );
 const aligned=authority.state==='verified-identity'&&authority.title!==null&&
  recordedNotations.some(token=>exactRecordedNotationInTitle(token,authority.title!));
 const authorityWithAlignment=Object.freeze({
  ...authority,
  alignment:authority.state==='verified-identity'?
   (aligned?'recorded-notation-aligned':'unconfirmed') as NameAlignment:authority.alignment
 });
 const conflictCount=therapies.reduce((count,t)=>count+t.flaggedConflicts,0);
 const approvedCount=claims.filter(x=>x.status==='approved').length;
 const pendingCount=claims.filter(x=>x.status==='pending').length;
 const reviewWork=therapies.some(x=>x.actionNeeded)||pendingCount>0;
 return Object.freeze({
  variantId,variantName:input.variantName,
  identity:Object.freeze({...input.identity,aliases:Object.freeze([...input.identity.aliases])}),
  authority:authorityWithAlignment,therapies:Object.freeze(therapies),
  sources:Object.freeze(sources),approvedClaims:approvedCount,pendingClaims:pendingCount,
  responseRecordConflictCount:conflictCount,
  unresolvedTherapies:therapies.filter(x=>x.actionNeeded).length,
  overallInterpretation:conflictCount?'source-disagreement':
   reviewWork?'review-work-needed':approvedCount?'research-source-reports-present':
   'verification-unavailable',
  limitations:Object.freeze([
   'ClinVar germline clinical significance is not a CFTR functional mechanism class or drug-response result.',
   'Bibliographic indexing confirms only an article identity, not the claim that it studied this variant.',
   'The absence of an approved claim in this complete accessible register is not evidence of drug non-response.',
   'Variant-level response records are distinct from genotype-specific regulatory eligibility and patient outcomes.',
   'No database classification is changed without separate scientific curation and independent approval.'
  ])
 });
}
