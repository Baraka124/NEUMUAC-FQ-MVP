import {describe,it,expect} from 'vitest';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {prepareEvidenceContribution} from './evidenceContributionDraft';
const source:LiveEvidenceReference={id:12,variantId:'42',title:'Recorded reference',url:'https://pubmed.ncbi.nlm.nih.gov/12345/',source:'PubMed',type:null,category:null,journal:null,year:2022,doi:null,pmid:'12345',recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
const draft={reference:source,field:'year' as const,suggestedValue:'2023',rationale:'The publication lists this recorded year.'};
describe('contributor correction packet only; no server write',()=>{
 it('binds proposal to actual reference and variant, not a user-supplied reviewer identity',()=>{
  const content=prepareEvidenceContribution(draft)!;
  expect(content).toContain('Recorded reference ID:** 12');
  expect(content).toContain('Recorded variant ID:** 42');
  expect(content).toContain('Currently recorded: 2022');
  expect(content).toContain('Suggested value: 2023');
  expect(content).toContain('Unsubmitted local proposal');
  expect(content).not.toContain('Approved by');
 });
 it('rejects malformed IDs, bad provenance fields and missing rationale',()=>{
  expect(prepareEvidenceContribution({...draft,reference:{...source,id:0}})).toBeNull();
  expect(prepareEvidenceContribution({...draft,reference:{...source,variantId:'42;delete'}})).toBeNull();
  expect(prepareEvidenceContribution({...draft,suggestedValue:'not a date'})).toBeNull();
  expect(prepareEvidenceContribution({...draft,rationale:'short'})).toBeNull();
  expect(prepareEvidenceContribution({...draft,field:'clinical_eligibility' as 'year'})).toBeNull();
 });
 it('validates DOI/PMID syntax without asserting evidence equivalence',()=>{
  expect(prepareEvidenceContribution({...draft,field:'doi',suggestedValue:'10.1016/j.example.2020.01.001'})).not.toBeNull();
  expect(prepareEvidenceContribution({...draft,field:'doi',suggestedValue:'http://example.com'})).toBeNull();
  expect(prepareEvidenceContribution({...draft,field:'pmid',suggestedValue:'7123456'})).not.toBeNull();
  expect(prepareEvidenceContribution({...draft,field:'pmid',suggestedValue:'n/a'})).toBeNull();
 });
 it('escapes line-free text for portable Markdown and refuses multiline control inputs',()=>{
  expect(prepareEvidenceContribution({...draft,field:'title',suggestedValue:'Possible *updated* title'})).toContain('Possible \\*updated\\* title');
  expect(prepareEvidenceContribution({...draft,field:'title',suggestedValue:'line one\nline two'})).toBeNull();
 });
});
