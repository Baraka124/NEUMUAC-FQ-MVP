import {describe,it,expect} from 'vitest';
import {sourceInterpretationOpportunities} from './sourceInterpretationOpportunities';
import type {CuratedSourceClaim} from '../services/curatedSourceClaims';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {MolecularReviewRecord} from '../services/molecularReviewService';

const sourceId='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const reference={id:71,variantId:'18',
 title:'Source recorded in original bibliography',url:'https://pubmed.ncbi.nlm.nih.gov/12345678/'
} as LiveEvidenceReference;
const source=(more:Partial<CuratedSourceClaim>={}):CuratedSourceClaim=>({
 id:sourceId,seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,parentClaimId:null,variantId:'18',referenceId:71,therapy:'ETI',
 scope:'single-variant',genotypePair:null,method:'in-vitro-study',finding:'inconclusive',
 studyFamilyId:'PMID-12345678',locator:'Original figure 2B',
 rationale:'The source explicitly describes the experimental context.',
 endpoint:null,studyStats:null,studyIdentity:null,status:'approved',
 submittedAt:'2026-11-17T17:00:00Z',submittedByMe:false,reviewCount:2,
 reviewedAt:'2026-11-17T18:00:00Z',canReview:false,
 reviewSeals:['attestation:11111111-1111-4111-8111-111111111111',
  'attestation:22222222-2222-4222-8222-222222222222'],audit:[],...more
});
const molecular=(more:Partial<MolecularReviewRecord>={}):MolecularReviewRecord=>({
 id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',seriesId:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
 revision:1,parentId:null,variantId:'18',sourceClaimId:sourceId,
 categories:['rna-splicing'],interpretation:'mechanistic-hypothesis',
 statement:'A hypothesis explicitly extracted from the linked original scientific study.',
 exactLocator:'Original figure 2B',experimentalContext:'Source-recorded experimental model and exact genotype.',
 limitations:'Clinical generalization is not supported by this specific experimental source.',
 status:'approved',submittedAt:'2026-11-17T18:00:00Z',submittedByMe:false,
 canReview:false,reviewCount:2,
 reviewSeals:['attestation:33333333-3333-4333-8333-333333333333',
 'attestation:44444444-4444-4444-8444-444444444444'],
 reviewAudit:[
  {decision:'approve',note:'First independent source-specific interpretation reviewed.',at:'2026-11-17T19:00:00Z'},
  {decision:'approve',note:'Second independent scientific interpretation review completed.',at:'2026-11-17T19:10:00Z'}
 ],events:[],...more
});
describe('14H195–196 single-variant molecular workbench source routing',()=>{
 it('identifies a real approved source needing independent molecular annotation',()=>{
  const rows=sourceInterpretationOpportunities({variantId:'18',
   claims:[source()],references:[reference],mechanisms:[]});
  expect(rows).toHaveLength(1);
  expect(rows[0]?.canPropose).toBe(true);
  expect(rows[0]?.state).toBe('ready-for-molecular-annotation');
  expect(rows[0]?.approvedMolecularCount).toBe(0);
 });
 it('never marks a submitted proposal as independently approved',()=>{
  const rows=sourceInterpretationOpportunities({variantId:'18',
   claims:[source()],references:[reference],mechanisms:[
    molecular({status:'pending',reviewCount:1,reviewSeals:[],
     reviewAudit:[molecular().reviewAudit[0]!]})
   ]});
  expect(rows[0]?.state).toBe('molecular-review-pending');
  expect(rows[0]?.approvedMolecularCount).toBe(0);
 });
 it('separately enforces both source and molecular review before recognizing a complete chain',()=>{
  const valid=sourceInterpretationOpportunities({variantId:'18',
   claims:[source()],references:[reference],mechanisms:[molecular()]});
  expect(valid[0]?.state).toBe('independently-approved-molecular-interpretation');
  const unreviewed=sourceInterpretationOpportunities({variantId:'18',
   claims:[source({reviewCount:1,reviewSeals:[]})],references:[reference],
   mechanisms:[molecular()]});
  expect(unreviewed[0]?.canPropose).toBe(false);
  expect(unreviewed[0]?.state).toBe('underlying-source-unverified');
 });
 it('does not treat bibliographic link or pending source as mechanism evidence',()=>{
  const rows=sourceInterpretationOpportunities({variantId:'18',
   claims:[source({status:'pending',reviewCount:1,reviewSeals:[],reviewedAt:null})],
   references:[reference],mechanisms:[]});
  expect(rows[0]?.state).toBe('awaiting-independent-source-review');
  expect(rows[0]?.canPropose).toBe(false);
 });
 it('fails closed on cross-variant sources and duplicated identities',()=>{
  expect(()=>sourceInterpretationOpportunities({variantId:'18',
   claims:[source({variantId:'19'})],references:[reference],mechanisms:[]})).toThrow();
  expect(()=>sourceInterpretationOpportunities({variantId:'18',
   claims:[source(),source()],references:[reference],mechanisms:[]})).toThrow();
  expect(()=>sourceInterpretationOpportunities({variantId:'18',
   claims:[source()],references:[{...reference,variantId:'19'}],mechanisms:[]})).toThrow();
 });
});
