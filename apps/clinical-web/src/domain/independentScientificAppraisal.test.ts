import {describe,it,expect} from 'vitest';
import {EMPTY_SCIENTIFIC_APPRAISAL,scientificAppraisalReadiness,
 scientificAppraisalReviewNote,type IndependentScientificAppraisal} from './independentScientificAppraisal';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {MolecularReviewRecord} from '../services/molecularReviewService';

const variantId='18',sourceClaimId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const source:CuratedSourceClaim={
 id:sourceClaimId,seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,parentClaimId:null,variantId,referenceId:17,therapy:'ETI',
 scope:'single-variant',genotypePair:null,method:'in-vitro-study',
 finding:'inconclusive',studyFamilyId:'study-18',
 locator:'Figure 3 and methods section',rationale:'Original experimental source reviewed in full',
 endpoint:null,studyStats:null,studyIdentity:null,
 status:'approved',submittedAt:'2026-11-18T01:00:00Z',submittedByMe:false,
 reviewCount:2,canReview:false,reviewedAt:'2026-11-18T02:00:00Z',
 reviewSeals:['attestation:aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'attestation:bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'],audit:[]
};
const original:LiveEvidenceReference={
 id:17,variantId,title:'Original cell experiment',source:'PubMed',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',type:null,category:null,
 journal:null,year:2024,pmid:'12345678',doi:null,recordedQualityScore:null,
 recordedSourceWeight:null,recordedCitationCount:null
};
const mechanism:MolecularReviewRecord={
 id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 revision:1,parentId:null,variantId,sourceClaimId,
 categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
 statement:'Source authors hypothesize transcript processing in a specified cell model.',
 exactLocator:'Figure 3 and experimental methods',
 experimentalContext:'Experimental investigation in variant-bearing cell cultures.',
 limitations:'Independent functional replication and causality remain unconfirmed.',
 status:'pending',submittedAt:'2026-11-18T02:00:00Z',
 submittedByMe:false,canReview:true,reviewCount:0,
 reviewSeals:[],reviewAudit:[],events:[]
};
const reviewed:IndependentScientificAppraisal={
 sourceAlignment:'supported',assayContext:'explicit',genotypeScope:'explicit',
 replication:'not-established',contradictions:'not-reported',
 limitations:'explicit',
 rationale:'I checked the original figure and genotype scope; mechanistic causality is not established.'
};
describe('14H190–191 independent scientific appraisal',()=>{
 it('requires explicit criteria without manufacturing a scientific confidence score',()=>{
  expect(scientificAppraisalReadiness(EMPTY_SCIENTIFIC_APPRAISAL).complete).toBe(false);
  const result=scientificAppraisalReadiness(reviewed);
  expect(result.complete).toBe(true);
  expect(result.approvalEligible).toBe(true);
  expect(result.clinicalDecisionProvided).toBe(false);
  expect(scientificAppraisalReviewNote({
   record:mechanism,assessment:reviewed,decision:'approve',
   claims:[source],references:[original]
  })).toContain('Replication=not-established');
 });
 it('blocks approval if original does not support exact molecular interpretation',()=>{
  const unsupported={...reviewed,sourceAlignment:'unsupported' as const};
  expect(scientificAppraisalReadiness(unsupported).complete).toBe(true);
  expect(scientificAppraisalReadiness(unsupported).approvalEligible).toBe(false);
  expect(()=>scientificAppraisalReviewNote({record:mechanism,
   assessment:unsupported,decision:'approve',claims:[source],references:[original]})).toThrow();
  expect(scientificAppraisalReviewNote({record:mechanism,
   assessment:unsupported,decision:'reject',claims:[source],references:[original]}))
   .toContain('Decision=reject');
 });
 it('refuses independent approval when contradiction remains unresolved',()=>{
  const conflict={...reviewed,contradictions:'unresolved' as const};
  expect(scientificAppraisalReadiness(conflict).approvalEligible).toBe(false);
  expect(()=>scientificAppraisalReviewNote({record:mechanism,
   assessment:conflict,decision:'approve',claims:[source],references:[original]})).toThrow();
 });
 it('rejects a self-review, orphaned source, or withdrawn original',()=>{
  expect(()=>scientificAppraisalReviewNote({record:{...mechanism,canReview:false},
   assessment:reviewed,decision:'approve',claims:[source],references:[original]})).toThrow();
  expect(()=>scientificAppraisalReviewNote({record:mechanism,
   assessment:reviewed,decision:'approve',claims:[source],references:[]})).toThrow();
  expect(()=>scientificAppraisalReviewNote({record:mechanism,
   assessment:reviewed,decision:'approve',
   claims:[{...source,status:'superseded',reviewSeals:[],reviewCount:0,reviewedAt:null}],
   references:[original]})).toThrow();
 });
 it('rejects an incomplete checklist and malformed reviewer rationale',()=>{
  const missing={...reviewed,replication:'unassessed' as const};
  expect(scientificAppraisalReadiness(missing).complete).toBe(false);
  expect(()=>scientificAppraisalReviewNote({record:mechanism,
   assessment:missing,decision:'reject',claims:[source],references:[original]})).toThrow();
  expect(scientificAppraisalReadiness({...reviewed,rationale:'too short'}).complete).toBe(false);
 });
});
