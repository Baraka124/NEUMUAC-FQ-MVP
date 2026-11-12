import {describe,it,expect} from 'vitest';
import {evidenceCurationPageFindings} from './evidenceCurationPage';
import type {LiveEvidenceReference} from '../services/liveEvidence';

const ref=(id:number,variantId='35',overrides:Partial<LiveEvidenceReference>={}):LiveEvidenceReference=>({
 id,variantId,title:'Reference '+id,
 url:'https://doi.org/10.1000/example-'+id,
 source:'PubMed',type:'Journal article',category:'Research',journal:'Example',
 year:2025,doi:'10.1000/example-'+id,pmid:null,
 recordedQualityScore:0,recordedSourceWeight:0,recordedCitationCount:0,
 ...overrides
});

describe('14H136 evidence source curation, not automated appraisal',()=>{
 it('does not flag complete, consistent catalogued references',()=>{
  expect(evidenceCurationPageFindings([ref(1),ref(2)])).toEqual([]);
 });
 it('retains a concrete identifier mismatch as a review signal without changing the reference',()=>{
  const source=ref(1,'35',{doi:'10.1000/different'});
  const initial=JSON.stringify(source);
  const findings=evidenceCurationPageFindings([source]);
  expect(findings).toHaveLength(1);
  expect(findings[0]).toMatchObject({
   referenceId:1,variantId:'35',kind:'identifier-mismatch',label:'Identifier mismatch',
   category:'identifier-review'
  });
  expect(findings[0].context).toContain('Recorded DOI differs');
  expect(JSON.stringify(source)).toBe(initial);
  expect(Object.isFrozen(findings)).toBe(true);
  expect(Object.isFrozen(findings[0])).toBe(true);
 });
 it('flags same-variant DOI/PMID repeats only within the visible page',()=>{
  const first=ref(1,'35',{doi:'10.1000/SAME',pmid:'123',
   url:'https://pubmed.ncbi.nlm.nih.gov/123/'});
  const second=ref(2,'35',{doi:'https://doi.org/10.1000/same',pmid:'123',
   url:'https://pubmed.ncbi.nlm.nih.gov/123/'});
  const otherVariant=ref(3,'19',{doi:'10.1000/same',pmid:'123',
   url:'https://pubmed.ncbi.nlm.nih.gov/123/'});
  const found=evidenceCurationPageFindings([first,second,otherVariant]);
  expect(found.filter(x=>x.kind==='same-variant-duplicate-doi')).toHaveLength(2);
  expect(found.filter(x=>x.kind==='same-variant-duplicate-pmid')).toHaveLength(2);
  expect(found.filter(x=>x.referenceId===3)).toHaveLength(0);
  expect(found.every(x=>x.context.includes('current page')||x.kind==='identifier-mismatch')).toBe(true);
 });
 it('separates unrecorded catalogue fields from scientific interpretation',()=>{
  const source=ref(4,'35',{doi:null,pmid:null,year:null,type:null,
   url:'https://www.cftr2.org/'});
  const found=evidenceCurationPageFindings([source]);
  expect(found.map(x=>x.kind)).toEqual([
   'identifier-not-recorded','year-not-recorded','type-not-recorded'
  ]);
  expect(found.every(x=>x.category==='catalogue-metadata')).toBe(true);
  expect(found[0].context).toContain('Some source types do not have these identifiers');
  expect(found[2].context).toContain('do not infer study design');
 });
 it('never invents review completion, quality scores or variant response from an empty page',()=>{
  expect(evidenceCurationPageFindings([])).toEqual([]);
  const found=evidenceCurationPageFindings([ref(2,'35',{type:null})]);
  expect(found).toHaveLength(1);
  expect(found[0].kind).toBe('type-not-recorded');
  expect(Object.keys(found[0])).toEqual(['referenceId','variantId','kind','label','context','category']);
 });
});
