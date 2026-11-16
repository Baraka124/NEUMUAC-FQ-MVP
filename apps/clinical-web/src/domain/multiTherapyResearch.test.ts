import {describe,it,expect} from 'vitest';
import {projectVariantTherapies} from './therapyRegistry';
import {buildMultiTherapyResearchReport,type ArchivedTherapyEvidence} from './multiTherapyResearch';
import {researchEngineWorksheet} from './researchEngineExport';
import {reconcileReviewedSourceClaims,type DoubleReviewedSourceClaim} from './sourceConflictReconciliation';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import type {ResearchHistory} from '../services/liveResearchHistory';

const profile=(eti:'responsive'|'non_responsive'|'unknown'|null='responsive')=>
 projectVariantTherapies({id:'18',functionalClass:'IV',classSubtype:'standard',validationCount:2,
 eti,alyftrek:null,etiEvidenceLevel:null,alyftrekEvidenceLevel:null,etiEvidenceTier:null,alyftrekEvidenceTier:null,
 etiAuthority:null,alyftrekAuthority:null});
const bibliography:LiveEvidenceReference={
 id:71,variantId:'18',title:'Independent source requiring verification',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',source:'PubMed',type:null,category:null,
 journal:null,year:null,pmid:'12345678',doi:null,recordedQualityScore:9,
 recordedSourceWeight:1,recordedCitationCount:20
};
const history:ResearchHistory={
 validations:[],conflicts:[{id:2,variantId:'18',field:'eti_prediction',severity:'high',resolved:true,
 detectedAt:'2026-02-01T00:00:00Z',resolvedAt:'2026-02-03T00:00:00Z'}]
};
const archived:ArchivedTherapyEvidence={
 id:4,variantId:'18',sourceId:2,etiResponse:'non_responsive',alyftrekResponse:null,
 recordedConfidence:'medium',recordedAt:'2026-02-09T12:00:00Z'
};
const claim=(id:string,studyFamilyId:string,method:DoubleReviewedSourceClaim['method'],
 finding:DoubleReviewedSourceClaim['finding']):DoubleReviewedSourceClaim=>({
 id,variantId:'18',therapy:'ETI',scope:'single-variant',method,finding,studyFamilyId,
 referenceId:71,locator:'Results · Table 2',reviewedBy:['reviewer-A','reviewer-B'],
 reviewedAt:'2026-08-20T09:00:00Z'
});
describe('14H165: five-therapy research evidence engine',()=>{
 it('includes all 5 regimens, preserves archival flags and never turns bibliography into evidence',()=>{
  const report=buildMultiTherapyResearchReport({variantId:'18',therapyProfile:profile(),
    references:[bibliography],archivedEvidence:[archived],history});
  expect(report.assessedTherapies).toHaveLength(5);
  expect(report.assessedTherapies.map(x=>x.therapy)).toEqual([
   'ETI','ALYFTREK','IVACAFTOR','TEZACAFTOR_IVACAFTOR','LUMACAFTOR_IVACAFTOR'
  ]);
  expect(report.bibliographicLinks).toBe(1);
  expect(report.independentlyReviewedClaims).toBe(0);
  expect(report.assessedTherapies[0].recordedResponse).toBe('responsive');
  expect(report.assessedTherapies[0].archiveDisagreesWithRecorded).toBe(true);
  expect(report.assessedTherapies[0].historicalContradictionEvents).toBe(1);
  expect(report.assessedTherapies[0].state).toBe('archived-records-only');
  expect(report.assessedTherapies[1].state).toBe('insufficient-evidence');
  expect(report.assessedTherapies[2].recordedResponse).toBeNull();
  expect(report.assessedTherapies.every(x=>x.clinicalPredictionProvided===false)).toBe(true);
  expect(report.clinicalDecisionProvided).toBe(false);
 });
 it('detects contradicting independent comparable studies without averaging or overwriting recorded labels',()=>{
  const report=buildMultiTherapyResearchReport({variantId:'18',therapyProfile:profile(),
   references:[bibliography],archivedEvidence:[],history,
   reviewedObservations:[
    claim('claim-1','independent-A','clinical-study','reported-response'),
    claim('claim-2','independent-B','clinical-study','reported-no-response')
   ]});
  const eti=report.assessedTherapies[0];
  expect(eti.sourceAssessment.positiveFamilies).toBe(1);
  expect(eti.sourceAssessment.negativeFamilies).toBe(1);
  expect(eti.state).toBe('review-conflict');
  expect(eti.conflicts.some(x=>x.kind==='opposing-reviewed-studies')).toBe(true);
  expect(eti.recordedResponse).toBe('responsive');
  expect(eti.clinicalPredictionProvided).toBe(false);
 });
 it('same study with multiple claims is not an independent replication',()=>{
  const result=reconcileReviewedSourceClaims('18','ETI',[
   claim('a','family-1','clinical-study','reported-response'),
   claim('b','family-1','clinical-study','reported-response')
  ],[71]);
  expect(result.verifiedStudyFamilies).toBe(1);
  expect(result.positiveFamilies).toBe(1);
  expect(result.conflicts).toHaveLength(0);
 });
 it('same-family contradictory findings are explicitly reviewable',()=>{
  const result=reconcileReviewedSourceClaims('18','ETI',[
   claim('a','family-1','clinical-study','reported-response'),
   claim('b','family-1','clinical-study','reported-no-response')
  ],[71]);
  expect(result.direction).toBe('mixed');
  expect(result.conflicts[0].kind).toBe('within-study-disagreement');
  expect(result.positiveFamilies).toBe(0);
  expect(result.negativeFamilies).toBe(0);
 });
 it('clinical-laboratory differences are flagged but not treated as direct contradiction',()=>{
  const result=reconcileReviewedSourceClaims('18','ETI',[
   claim('a','family-1','clinical-study','reported-response'),
   claim('b','family-2','in-vitro-study','reported-no-response')
  ],[71]);
  expect(result.conflicts.map(x=>x.kind)).toContain('clinical-laboratory-translation');
  expect(result.conflicts.map(x=>x.kind)).not.toContain('opposing-reviewed-studies');
 });
 it('requires actual independent review and exact linked references',()=>{
  const unreviewed={...claim('c','family-3','clinical-study','reported-response'),
   reviewedBy:['same','same'] as [string,string]};
  const wrongReference={...claim('d','family-4','clinical-study','reported-response'),referenceId:100};
  const result=reconcileReviewedSourceClaims('18','ETI',[unreviewed,wrongReference],[71]);
  expect(result.verifiedStudyFamilies).toBe(0);
  expect(result.pendingObservations).toBe(2);
  expect(result.direction).toBe('unavailable');
 });
 it('exports five traceable regimens as a nonclinical source worksheet',()=>{
  const report=buildMultiTherapyResearchReport({variantId:'18',therapyProfile:profile(),
   references:[bibliography],archivedEvidence:[archived],history});
  const document=researchEngineWorksheet(report,'R117H | <research>');
  expect(document).toContain('R117H \\| &lt;research&gt;');
  expect(document).toContain('Kalydeco');
  expect(document).toContain('Symkevi');
  expect(document).toContain('Alyftrek');
  expect(document).toContain('source observations');
  expect(document).not.toContain('response probability:');
 });
 it('rejects cross-variant source contamination',()=>{
  expect(()=>buildMultiTherapyResearchReport({variantId:'19',therapyProfile:profile(),
   references:[bibliography],archivedEvidence:[],history})).toThrow();
  expect(()=>buildMultiTherapyResearchReport({variantId:'18',therapyProfile:profile(),
   references:[{...bibliography,variantId:'19'}],archivedEvidence:[],history})).toThrow();
 });
});
