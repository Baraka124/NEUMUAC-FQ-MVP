import {describe,it,expect} from 'vitest';
import {sourceSubmissionReadiness,researchReviewHandoff,
 makeVerifiedScientificExport,portableScientificExport} from './scientificReviewReadiness';
import type {CuratedSourceClaim,CuratedClaimPayload} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {UNEXTRACTED_ENDPOINT} from './researchEndpointNormalization';
import {UNREPORTED_STUDY_STATISTICS} from './reportedStudyStatistics';
import {UNREPORTED_STUDY_IDENTITY} from './reportedStudyIdentity';

const sourceId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const seriesId='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const molecularId='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const reference:LiveEvidenceReference={
 id:71,variantId:'18',title:'Published CFTR functional assay',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',source:'PubMed',type:null,category:null,
 journal:null,year:2024,pmid:'12345678',doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
const payload:CuratedClaimPayload={
 therapy:'ETI',referenceId:71,scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'inconclusive',studyFamilyId:'study-18',
 locator:'Original article Figure 2B',
 rationale:'Source reports an experimental observation under explicitly stated assay conditions.',
 endpoint:UNEXTRACTED_ENDPOINT,studyStats:UNREPORTED_STUDY_STATISTICS,
 studyIdentity:UNREPORTED_STUDY_IDENTITY
};
const claim=(overrides:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id:sourceId,seriesId,revision:1,parentClaimId:null,variantId:'18',
 referenceId:71,therapy:'ETI',scope:'single-variant',genotypePair:null,
 method:'in-vitro-study',finding:'inconclusive',studyFamilyId:'study-18',
 locator:'Figure 2B',rationale:'Source-reported, independently evaluated observation.',
 endpoint:UNEXTRACTED_ENDPOINT,studyStats:UNREPORTED_STUDY_STATISTICS,
 studyIdentity:UNREPORTED_STUDY_IDENTITY,status:'approved',
 submittedAt:'2026-11-17T13:00:00Z',submittedByMe:false,reviewCount:2,
 reviewedAt:'2026-11-17T14:00:00Z',reviewSeals:[
 'attestation:11111111-1111-4111-8111-111111111111',
 'attestation:22222222-2222-4222-8222-222222222222'
 ],canReview:false,audit:[],...overrides
});
const molecule=(overrides:Partial<MolecularReviewRecord>={}):MolecularReviewRecord=>({
 id:molecularId,seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 revision:1,parentId:null,variantId:'18',sourceClaimId:sourceId,
 categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
 statement:'Source discusses a potential contribution of RNA processing to experimental outcomes.',
 exactLocator:'Results · Figure 2B',
 experimentalContext:'Observed in the reported cellular model with the exact CFTR variant.',
 limitations:'Independent molecular replication and clinical generalizability are not established.',
 status:'approved',submittedAt:'2026-11-17T15:00:00Z',
 submittedByMe:false,canReview:false,reviewCount:2,
 reviewSeals:['attestation:33333333-3333-4333-8333-333333333333',
 'attestation:44444444-4444-4444-8444-444444444444'],
 reviewAudit:[
 {decision:'approve',note:'Reviewed context and exact original publication locator.',at:'2026-11-17T16:00:00Z'},
 {decision:'approve',note:'Second independent source-specific interpretation review.',at:'2026-11-17T17:00:00Z'}
 ],events:[],...overrides
});
describe('14H191 publication intake and review handoff',()=>{
 it('reports precise required fields without inventing an experimental endpoint',()=>{
  const ready=sourceSubmissionReadiness('18',payload,[reference]);
  expect(ready.canSubmit).toBe(true);
  expect(ready.instructions).toHaveLength(0);
  expect(ready.validStructuredContext).toBe(true);
  const missing=sourceSubmissionReadiness('18',{
   ...payload,referenceId:72,studyFamilyId:'',locator:'none',
   rationale:'short'
  },[reference]);
  expect(missing.canSubmit).toBe(false);
  expect(missing.instructions.length).toBeGreaterThanOrEqual(4);
 });
 it('separates one and two reviewer handoffs and source gating',()=>{
  const pending=claim({status:'pending',reviewCount:1,reviewedAt:null,
   reviewSeals:[],canReview:false});
  const molecularPending=molecule({status:'pending',reviewCount:0,reviewSeals:[],reviewAudit:[]});
  const summary=researchReviewHandoff({variantId:'18',
   sourceClaims:[pending],molecularClaims:[molecularPending]});
  expect(summary.sourceAwaitingSecond).toBe(1);
  expect(summary.sourceAwaitingOtherReviewer).toBe(1);
  expect(summary.molecularAwaitingFirst).toBe(1);
  expect(summary.sourceLinkedEvidenceRequired).toBe(true);
  expect(summary.approvedMolecularClaims).toBe(0);
 });
 it('fails closed on cross-variant or fabricated source review seals',()=>{
  expect(()=>researchReviewHandoff({variantId:'18',
   sourceClaims:[claim({variantId:'19'})],molecularClaims:[]})).toThrow();
  expect(()=>researchReviewHandoff({variantId:'18',
   sourceClaims:[claim({reviewSeals:['same','same']})],molecularClaims:[]})).toThrow();
 });
});
describe('14H192 source-traceable research exports',()=>{
 const context={variantId:'18',claims:[claim()],molecular:[molecule()],
  references:[reference],generatedAt:'2026-11-17T18:00:00.000Z'};
 it('exports two separate approvals, source URL and original context without treatment recommendation',()=>{
  const result=makeVerifiedScientificExport(context);
  expect(result.approvedSources).toHaveLength(1);
  expect(result.approvedSources[0]?.sourceUrl).toBe(reference.url);
  expect(result.approvedMolecularInterpretations).toHaveLength(1);
  expect(result.approvedMolecularInterpretations[0]?.reviewerRationales).toHaveLength(2);
  expect(result.decisionUse).toBe('research-only-not-clinical');
  expect(portableScientificExport(result)).toContain('neumuacfq-research-audit-v1');
 });
 it('excludes pending molecular interpretations and reports exclusion count without exposing drafts',()=>{
  const pending=molecule({status:'pending',reviewCount:1,reviewSeals:[],
   reviewAudit:[molecule().reviewAudit[0]!]});
  const result=makeVerifiedScientificExport({...context,molecular:[pending]});
  expect(result.approvedMolecularInterpretations).toHaveLength(0);
  expect(result.pendingExcluded.molecularClaims).toBe(1);
  expect(portableScientificExport(result)).not.toContain(pending.statement);
 });
 it('never includes approved molecular interpretation with withdrawn original source approval',()=>{
  const result=makeVerifiedScientificExport({...context,claims:[
   claim({status:'withdrawn',reviewSeals:[],reviewedAt:null,reviewCount:2})
  ]});
  expect(result.approvedSources).toHaveLength(0);
  expect(result.approvedMolecularInterpretations).toHaveLength(0);
  expect(researchReviewHandoff({variantId:'18',sourceClaims:[
   claim({status:'withdrawn',reviewSeals:[],reviewedAt:null,reviewCount:2})
  ],molecularClaims:[molecule()]}).blockedMolecularClaims).toBe(1);
 });
 it('refuses orphaned source publications rather than export unlinked evidence',()=>{
  expect(()=>makeVerifiedScientificExport({...context,references:[]})).toThrow();
  expect(()=>makeVerifiedScientificExport({...context,claims:[claim(),claim()]})).toThrow();
 });
});
