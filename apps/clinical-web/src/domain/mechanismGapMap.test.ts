import {describe,it,expect} from 'vitest';
import {prepareMechanismAnnotationDraft,portableMechanismDraft} from './mechanismAnnotationDraft';
import {buildCrossVariantGapMap} from './crossVariantGapMap';
import {appraiseExperimentalEvidence} from './experimentalEvidenceAppraisal';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {MolecularReviewRecord} from '../services/molecularReviewService';
import type {LiveEvidenceReference} from '../services/liveEvidence';

const reference=(variantId:string):LiveEvidenceReference=>({
 id:71,variantId,title:'Original experimental publication',source:'PubMed',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',type:null,category:null,
 journal:null,year:2024,pmid:'12345678',doi:null,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
});
const claim=(variantId:string,override:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id:variantId==='18'?'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa':'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 seriesId:variantId==='18'?'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb':'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 revision:1,parentClaimId:null,variantId,referenceId:71,therapy:'ETI',
 scope:'single-variant',genotypePair:null,method:'in-vitro-study',
 finding:'reported-response',studyFamilyId:'experiment-'+variantId,
 locator:'Figure 2B · original study',rationale:'Experimental context described in source',
 endpoint:null,studyStats:null,studyIdentity:null,status:'approved',
 submittedAt:'2026-11-17T09:00:00Z',submittedByMe:false,
 reviewCount:2,canReview:false,reviewedAt:'2026-11-17T10:00:00Z',
 reviewSeals:['attestation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'attestation:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],audit:[],...override
});
const proposal={
 variantId:'18',claimId:claim('18').id,categories:['rna-splicing','trafficking'] as const,
 interpretation:'mechanistic-hypothesis' as const,
 statement:'The authors propose a possible transcript-processing contribution; this remains unconfirmed.',
 exactLocator:'Figure 2B · Results, paragraph 4',
 experimentalContext:'Reported in a cell-line context with explicit variant identity',
 limitations:'Mechanistic causality has not been independently established for this variant.'
};
describe('14H185 source-linked molecular research drafts',()=>{
 it('supports overlapping mechanism categories without auto-approval',()=>{
  const result=prepareMechanismAnnotationDraft(proposal,[claim('18')],[reference('18')]);
  expect(result.categories).toEqual(['rna-splicing','trafficking']);
  expect(result.validationState).toBe('unreviewed-research-draft');
  expect(result.clinicalDecisionProvided).toBe(false);
  expect(result.referenceId).toBe(71);
  expect(portableMechanismDraft(result)).toContain('separate-independent-scientific-adjudication');
 });
 it('rejects unapproved or unlinked source annotations and incomplete original locators',()=>{
  expect(()=>prepareMechanismAnnotationDraft(proposal,
   [claim('18',{status:'pending',reviewCount:0,reviewedAt:null,reviewSeals:[]})],
   [reference('18')])).toThrow();
  expect(()=>prepareMechanismAnnotationDraft(proposal,
   [claim('18',{referenceId:72})],[reference('18')])).toThrow();
  expect(()=>prepareMechanismAnnotationDraft({...proposal,exactLocator:'vague'},
   [claim('18')],[reference('18')])).toThrow();
  expect(()=>prepareMechanismAnnotationDraft({...proposal,categories:['rna-splicing','rna-splicing']},
   [claim('18')],[reference('18')])).toThrow();
 });
});
describe('14H186 research register gap map',()=>{
 const input={
  firstId:'18',secondId:'19',firstClaims:[claim('18')],
  secondClaims:[] as CuratedSourceClaim[],
  firstReferences:[reference('18')],secondReferences:[] as LiveEvidenceReference[]
 };
 it('distinguishes missing structured records from molecular absence',()=>{
  const result=buildCrossVariantGapMap(input);
  expect(result.cells).toHaveLength(10);
  const first=result.cells.find(c=>c.variantId==='18'&&c.therapy==='ETI')!;
  const second=result.cells.find(c=>c.variantId==='19'&&c.therapy==='ETI')!;
  expect(first.uniqueStudyFamilies).toBe(1);
  expect(first.evidenceDimensions.sourceCoverage).toBe('reviewed-source-present');
  expect(first.evidenceDimensions.experimentalExtraction).toBe('no-endpoint');
  expect(first.evidenceDimensions.causalConfidence).toBe('not-assessed-by-register');
  expect(second.evidenceDimensions.sourceCoverage).toBe('no-reviewed-source');
  expect(second.evidenceDimensions.reviewedInterpretations.mechanisticHypotheses).toBe(0);
  expect(first.gaps).toContain('mechanism-not-adjudicated');
  expect(second.gaps).toContain('no-reviewed-source-claim');
  expect(second.endpointObserved).toBe(false);
  expect(result.researchOnly).toBe(true);
 });
 it('unreviewed local proposals never close a verified mechanism gap',()=>{
  const draft=prepareMechanismAnnotationDraft(proposal,[claim('18')],[reference('18')]);
  const result=buildCrossVariantGapMap({...input,drafts:[draft]});
  expect(result.mechanismCoverage.find(x=>x.category==='rna-splicing')?.firstDraftCount).toBe(1);
  expect(result.mechanismCoverage.every(x=>x.verifiedMechanismCount===0)).toBe(true);
  expect(result.cells[0]?.gaps).toContain('mechanism-not-adjudicated');
 });
 it('counts only independently approved persisted molecular mechanisms',()=>{
  const approved:MolecularReviewRecord={
   id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
   seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
   revision:1,parentId:null,variantId:'18',sourceClaimId:claim('18').id,
   categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
   statement:'This is a sufficiently detailed experimentally grounded interpretation.',
   exactLocator:'Original Figure 2B',
   experimentalContext:'Study performed in variant-bearing experimental airway cells.',
   limitations:'Clinical genotype effect and independent functional replication are unknown.',
   status:'approved',submittedAt:'2026-11-17T14:00:00Z',
   submittedByMe:false,canReview:false,reviewCount:2,
   reviewSeals:['attestation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'attestation:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],
   reviewAudit:[
    {decision:'approve',note:'This interpretation was independently reviewed with complete source context.',at:'2026-11-17T13:00:00Z'},
    {decision:'approve',note:'Second scientific reviewer independently verified the source evidence.',at:'2026-11-17T13:30:00Z'}
   ],events:[]
  };
  const result=buildCrossVariantGapMap({...input,persisted:[approved]});
  const row=result.cells.find(c=>c.variantId==='18'&&c.therapy==='ETI')!;
  expect(row.approvedMolecularAnnotations).toBe(1);
  expect(row.evidenceDimensions.reviewedInterpretations.mechanisticHypotheses).toBe(1);
  expect(row.evidenceDimensions.reviewedInterpretations.sourceReportedObservations).toBe(0);
  expect(row.evidenceDimensions.causalConfidence).toBe('not-assessed-by-register');
  expect(buildCrossVariantGapMap({...input,persisted:[{
   ...approved,status:'pending',reviewCount:1,reviewSeals:[],
   reviewAudit:[approved.reviewAudit[0]!]
  }]}).cells[0]?.evidenceDimensions.reviewedInterpretations.mechanisticHypotheses).toBe(0);
  expect(row.gaps).not.toContain('mechanism-not-adjudicated');
  expect(result.mechanismCoverage.find(c=>c.category==='rna-splicing')?.verifiedMechanismCount).toBe(1);
  expect(()=>buildCrossVariantGapMap({...input,persisted:[{
   ...approved,reviewSeals:[approved.reviewSeals[0]!,approved.reviewSeals[0]!]
  }]})).toThrow();
  // Approval status alone is not evidence: the exact review audit and original
  // approved publication must also be independently verifiable.
  expect(()=>buildCrossVariantGapMap({...input,persisted:[{
   ...approved,reviewAudit:[approved.reviewAudit[0]!]
  }]})).toThrow();
  expect(()=>buildCrossVariantGapMap({...input,persisted:[{
   ...approved,reviewAudit:[
    {decision:'reject' as const,note:'Original publication does not support the claim.',at:'2026-11-17T13:00:00Z'},
    approved.reviewAudit[1]!
   ]
  }]})).toThrow();
  expect(()=>buildCrossVariantGapMap({...input,persisted:[approved],
   firstReferences:[]})).toThrow();
  expect(()=>buildCrossVariantGapMap({...input,persisted:[approved],
   firstClaims:[claim('18',{status:'superseded',reviewCount:0,reviewedAt:null,reviewSeals:[]})]
  })).toThrow();
  expect(()=>buildCrossVariantGapMap({...input,persisted:[
   approved,{...approved,id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',revision:2,
    parentId:approved.id}
  ]})).toThrow();
 });
 it('fails closed on cross-variant provenance or orphaned mechanism drafts',()=>{
  expect(()=>buildCrossVariantGapMap({...input,
   firstClaims:[claim('19')]})).toThrow();
  const orphan=prepareMechanismAnnotationDraft(proposal,[claim('18')],[reference('18')]);
  expect(()=>buildCrossVariantGapMap({...input,firstClaims:[],drafts:[orphan]})).toThrow();
  expect(()=>buildCrossVariantGapMap({...input,secondId:'18'})).toThrow();
 });
});

describe('14H189 source-grounded experimental evidence appraisal',()=>{
 const base=claim('18');
 const second:CuratedSourceClaim={...base,
  id:'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  seriesId:'ffffffff-ffff-4fff-8fff-ffffffffffff',
  studyFamilyId:'second-study',finding:'reported-no-response'};
 it('does not convert multiple papers or reviewed claims into replication or causality',()=>{
  const result=appraiseExperimentalEvidence({variantId:'18',therapy:'ETI',
   claims:[base,{...second,studyFamilyId:base.studyFamilyId}],
   references:[reference('18')]});
  expect(result.approvedSourceClaims).toBe(2);
  expect(result.studyClusters).toBe(1);
  expect(result.mixedOrInconclusiveClusters).toBe(1);
  expect(result.directionallyDiscordant).toBe(false);
  expect(result.proposedReplication).toBe('not-established-by-record-count');
  expect(result.studyMethods.inVitro).toBe(2);
  expect(result.variantScopes.singleVariant).toBe(2);
  expect(result.mechanisticDirectness).toBe('requires-source-specific-appraisal');
  expect(result.causalInterpretation).toBe('not-assessed');
 });
 it('flags separate opposing study clusters without inferring superiority',()=>{
  const result=appraiseExperimentalEvidence({variantId:'18',therapy:'ETI',
   claims:[base,second],references:[reference('18')]});
  expect(result.studyClusters).toBe(2);
  expect(result.reportedPositiveClusters).toBe(1);
  expect(result.reportedNegativeClusters).toBe(1);
  expect(result.directionallyDiscordant).toBe(true);
  expect(result.limitations.join(' ')).toContain('reconciliation');
 });
 it('excludes pending claims and fails closed on invalid approved provenance',()=>{
  const pending={...second,status:'pending' as const,reviewCount:0,
   reviewSeals:[],reviewedAt:null};
  const result=appraiseExperimentalEvidence({variantId:'18',therapy:'ETI',
   claims:[base,pending],references:[reference('18')]});
  expect(result.approvedSourceClaims).toBe(1);
  expect(()=>appraiseExperimentalEvidence({variantId:'18',therapy:'ETI',
   claims:[base],references:[]})).toThrow();
  expect(()=>appraiseExperimentalEvidence({variantId:'18',therapy:'ETI',
   claims:[claim('19')],references:[reference('18')]})).toThrow();
 });
});
