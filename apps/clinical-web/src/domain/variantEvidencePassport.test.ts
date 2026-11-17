import {describe,it,expect} from 'vitest';
import {buildEvidenceResearchPlan} from './evidenceResearchPriorities';
import {assembleEvidenceInvestigation} from './evidenceInvestigation';
import {projectVariantTherapies} from './therapyRegistry';
import {buildMultiTherapyResearchReport} from './multiTherapyResearch';
import {evaluateVariantEvidencePassport,assessPassportReference,
 comparePassportAuthority,type PassportIdentity} from './variantEvidencePassport';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {ClinVarAuthoritySummary} from '../services/liveClinVar';
import type {ResearchHistory} from '../services/liveResearchHistory';

const identity:PassportIdentity={
 legacyName:'1716G/A',cdnaName:'c.1584G>A',proteinName:'p.Glu528=',
 aliases:['NM_000492.4:c.1584G>A'],
 functionalClass:'II',classSubtype:null,clinVarId:'123456'
};
const external:ClinVarAuthoritySummary={
 variationId:'123456',accession:'VCV000123456',
 title:'NM_000492.4(CFTR):c.1584G>A (p.Glu528=)',
 germlineDescription:'Uncertain significance',
 reviewStatus:'criteria provided, conflicting interpretations',
 lastEvaluated:'2026-10-01',
 sourceUrl:'https://www.ncbi.nlm.nih.gov/clinvar/variation/123456/',
 retrievedAt:'2026-11-17T10:00:00Z'
};
const bibliographic:LiveEvidenceReference={
 id:71,variantId:'18',title:'Recorded source article',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',source:'PubMed',
 type:null,category:null,journal:null,year:2024,pmid:'12345678',
 doi:null,recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
const history:ResearchHistory={validations:[],conflicts:[]};
const profile=(eti:'responsive'|'non_responsive'|'unknown'|null)=>
 projectVariantTherapies({
  id:'18',functionalClass:'II',classSubtype:null,validationCount:null,
  eti,alyftrek:'non_responsive',etiEvidenceLevel:null,alyftrekEvidenceLevel:null,
  etiEvidenceTier:null,alyftrekEvidenceTier:null,etiAuthority:null,alyftrekAuthority:null
 });
const sourceClaim=(overrides:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,parentClaimId:null,variantId:'18',referenceId:71,therapy:'ETI',
 scope:'single-variant',genotypePair:null,method:'clinical-study',
 finding:'reported-no-response',studyFamilyId:'study-71',
 locator:'Results · Table 2',rationale:'Documented study observation',
 endpoint:null,studyStats:null,studyIdentity:null,
 status:'approved',submittedAt:'2026-11-17T09:00:00Z',
 submittedByMe:false,reviewCount:2,canReview:false,
 reviewedAt:'2026-11-17T10:00:00Z',
 reviewSeals:['reviewer-A','reviewer-B'],audit:[],
 ...overrides
});
function passport(
 eti:'responsive'|'non_responsive'|'unknown'|null='non_responsive',
 claims:readonly CuratedSourceClaim[]=[],summary:ClinVarAuthoritySummary|null=null
){
 const reviewed=claims.filter(x=>x.status==='approved').map(x=>({
  id:x.id,variantId:'18',therapy:x.therapy,scope:'single-variant' as const,
  method:'clinical-study' as const,
  finding:x.finding,studyFamilyId:x.studyFamilyId,
  referenceId:x.referenceId,locator:x.locator,
  reviewedBy:['reviewer-A','reviewer-B'] as [string,string],
  reviewedAt:x.reviewedAt??'2026-11-17T10:00:00Z'
 }));
 const report=buildMultiTherapyResearchReport({
  variantId:'18',therapyProfile:profile(eti),references:[bibliographic],
  history,archivedEvidence:[],reviewedObservations:reviewed
 });
 return evaluateVariantEvidencePassport({
  variantId:'18',variantName:'1716G/A',identity,report,
  references:[bibliographic],claims,clinVarSummary:summary,
  authorityAttempt:summary?'checked':'unchecked'
 });
}
describe('14H174 source-traceable CFTR variant evidence passport',()=>{
 it('keeps class II and non-responsive database categories separate from verified biological evidence',()=>{
  const p=passport();
  expect(p.identity.functionalClass).toBe('II');
  expect(p.therapies).toHaveLength(5);
  expect(p.therapies[0].databaseLabel).toBe('non_responsive');
  expect(p.therapies[0].verificationState).toBe('recorded-history-only');
  expect(p.therapies[0].provenanceNote).toContain('not independently confirmed');
  expect(p.therapies[1].databaseLabel).toBe('non_responsive');
  expect(p.therapies.slice(2).every(x=>x.databaseLabel===null&&
   x.coverage==='genotype-context-only')).toBe(true);
  expect(p.approvedClaims).toBe(0);
  expect(p.overallInterpretation).not.toBe('research-source-reports-present');
 });
 it('shows independently reviewed source report without implying clinical efficacy or altering recorded response',()=>{
  const p=passport('responsive',[sourceClaim()]);
  expect(p.approvedClaims).toBe(1);
  expect(p.therapies[0].databaseLabel).toBe('responsive');
  expect(p.therapies[0].verificationState).toBe('reviewed-conflict');
  expect(p.therapies[0].reviewedSourceReferences).toEqual([71]);
  expect(p.therapies[0].flaggedConflicts).toBeGreaterThan(0);
  expect(p.overallInterpretation).toBe('source-disagreement');
 });
 it('does not turn pending claims or linked articles into independent evidence',()=>{
  const p=passport('non_responsive',[sourceClaim({status:'pending',reviewCount:0})]);
  expect(p.pendingClaims).toBe(1);
  expect(p.approvedClaims).toBe(0);
  expect(p.sources[0].pendingClaimCount).toBe(1);
  expect(p.therapies[0].reviewedStudyFamilies).toBe(0);
 });
 it('records official ClinVar gene/ID indexing as different from functional class and drug efficacy',()=>{
  const p=passport('non_responsive',[],external);
  expect(p.authority.state).toBe('verified-identity');
  expect(p.authority.alignment).toBe('recorded-notation-aligned');
  expect(p.authority.classification).toBe('Uncertain significance');
  expect(p.therapies[0].databaseLabel).toBe('non_responsive');
  expect(p.therapies[0].verificationState).toBe('recorded-history-only');
  expect(p.identity.functionalClass).toBe('II');
 });
 it('does not conflate similar but different splice/legacy notations',()=>{
  const wrongTitle={...external,title:'NM_000492.4(CFTR):c.1584+1G>A (p.?)'};
  const input=passport('non_responsive',[],wrongTitle);
  expect(input.authority.state).toBe('verified-identity');
  expect(input.authority.alignment).toBe('unconfirmed');
  expect(input.authority.note).not.toContain('therapy response confirmed');
 });
 it('does not accept an external ClinVar identity from a different variant',()=>{
  const p=passport('non_responsive',[],{...external,variationId:'222222'});
  expect(p.authority.state).toBe('identity-disagreement');
  expect(p.authority.classification).toBeNull();
  expect(comparePassportAuthority(null,external,'checked').state).toBe('not-linked');
 });
 it('explicitly labels failed external verification as unavailable, never as no evidence',()=>{
  const result=comparePassportAuthority('123456',null,'failed');
  expect(result.state).toBe('unavailable');
  expect(result.note).toContain('no conclusion');
  expect(result.classification).toBeNull();
 });
 it('verifies exact indexed PubMed identifiers and stops before contacting a mismatched citation',()=>{
  const aligned=assessPassportReference(bibliographic);
  expect(aligned.indexingPmid).toBe('12345678');
  expect(aligned.catalogueCheck).toBe('recorded-pmid-aligned');
  const wrong=assessPassportReference({...bibliographic,pmid:'22222222'});
  expect(wrong.catalogueCheck).toBe('catalogue-pmid-conflict');
  expect(wrong.indexingPmid).toBeNull();
  const missing=assessPassportReference({...bibliographic,pmid:null});
  expect(missing.catalogueCheck).toBe('catalogue-pmid-missing');
  expect(missing.indexingPmid).toBeNull();
 });
 it('fails closed on a cross-variant source or claim instead of silently returning an empty result',()=>{
  const p=passport();
  const report=buildMultiTherapyResearchReport({
   variantId:'18',therapyProfile:profile('non_responsive'),
   references:[bibliographic],history,archivedEvidence:[]
  });
  expect(()=>evaluateVariantEvidencePassport({
   variantId:'18',variantName:'1716G/A',identity,
   report,references:[{...bibliographic,variantId:'19'}],claims:[],
   clinVarSummary:null,authorityAttempt:'unchecked'
  })).toThrow();
  expect(()=>evaluateVariantEvidencePassport({
   variantId:'18',variantName:'1716G/A',identity,
   report,references:[bibliographic],claims:[sourceClaim({variantId:'19'})],
   clinVarSummary:null,authorityAttempt:'unchecked'
  })).toThrow();
  expect(p.sources).toHaveLength(1);
 });
});

describe('14H175–176 evidence discrepancy triage and research prioritization',()=>{
 it('prioritizes review discrepancies without mutating the recorded therapeutic label',()=>{
  const claims=[sourceClaim()];
  const p=passport('responsive',claims);
  const plan=buildEvidenceResearchPlan(p,claims);
  expect(plan.variantId).toBe('18');
  expect(plan.tasks[0]?.category).toBe('review-disagreement');
  expect(plan.tasks[0]?.claimIds).toContain(claims[0]!.id);
  expect(plan.reviewFirst).toBeGreaterThan(0);
  expect(p.therapies[0]?.databaseLabel).toBe('responsive');
  expect(plan.isClinicalRecommendation).toBe(false);
 });
 it('keeps pending observations in independent review and recorded non-response in provenance audit',()=>{
  const claims=[sourceClaim({status:'pending',reviewCount:0,reviewedAt:null,reviewSeals:[]})];
  const plan=buildEvidenceResearchPlan(passport('non_responsive',claims),claims);
  expect(plan.tasks.some(t=>t.category==='pending-peer-review'&&
   t.claimIds.includes(claims[0]!.id))).toBe(true);
  expect(plan.tasks.some(t=>t.category==='response-record-audit'&&t.therapy==='ETI')).toBe(true);
  expect(plan.tasks.some(t=>t.nextAction.includes('absence here is not evidence of biological non-response'))).toBe(true);
 });
 it('flags official identifier disagreement separately from response evidence',()=>{
  const p=passport('non_responsive',[],{...external,variationId:'333333'});
  const plan=buildEvidenceResearchPlan(p,[]);
  expect(plan.tasks.some(t=>t.id==='authority:clinvar-identity'&&
   t.band==='review-first')).toBe(true);
  expect(plan.tasks.every(t=>t.therapy===null||t.therapy!=='ETI'||
   t.category!=='review-disagreement')).toBe(true);
 });
 it('rejects mismatched variant claims and never fabricates cross-variant research priorities',()=>{
  const p=passport();
  expect(()=>buildEvidenceResearchPlan(p,[sourceClaim({variantId:'19'})])).toThrow();
 });
});

describe('14H177–178 in-dossier evidence investigation and adjudication handoff',()=>{
 it('reconstructs exact source provenance and reviewer status for a conflicting approved claim',()=>{
  const claim=sourceClaim();
  const p=passport('responsive',[claim]);
  const task=buildEvidenceResearchPlan(p,[claim]).tasks.find(t=>t.category==='review-disagreement')!;
  const investigation=assembleEvidenceInvestigation(task,'18',[claim],p.sources);
  expect(investigation.approved).toBe(1);
  expect(investigation.pending).toBe(0);
  expect(investigation.observations[0]?.id).toBe(claim.id);
  expect(investigation.observations[0]?.referenceId).toBe(71);
  expect(investigation.observations[0]?.citationUrl).toBe(bibliographic.url);
  expect(investigation.observations[0]?.finding).toBe('reported-no-response');
  expect(investigation.observations[0]?.reviewCount).toBe(2);
  expect(investigation.canAdjudicateHere).toBe(false);
  expect(p.therapies[0]?.databaseLabel).toBe('responsive');
 });
 it('does not present unreviewed observations as approved',()=>{
  const claim=sourceClaim({status:'pending',reviewCount:0,reviewedAt:null,reviewSeals:[]});
  const p=passport('non_responsive',[claim]);
  const task=buildEvidenceResearchPlan(p,[claim]).tasks.find(t=>t.category==='pending-peer-review')!;
  const investigation=assembleEvidenceInvestigation(task,'18',[claim],p.sources);
  expect(investigation.approved).toBe(0);
  expect(investigation.pending).toBe(1);
  expect(investigation.observations[0]?.status).toBe('pending');
 });
 it('fails closed on cross-variant claims or stale claim references',()=>{
  const p=passport();
  const task=buildEvidenceResearchPlan(p,[]).tasks[0]!;
  expect(()=>assembleEvidenceInvestigation(task,'18',[sourceClaim({variantId:'19'})],p.sources)).toThrow();
  expect(()=>assembleEvidenceInvestigation(
   {...task,claimIds:['not-present']},'18',[],p.sources)).toThrow();
 });
});
