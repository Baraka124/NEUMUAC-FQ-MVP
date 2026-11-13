import {describe,it,expect} from 'vitest';
import {evidenceReconciliationPage} from './evidenceReconciliationPage';
import type {LiveEvidenceReference} from '../services/liveEvidence';

const source=(id:number,variantId='35',changes:Partial<LiveEvidenceReference>={}):LiveEvidenceReference=>({
 id,variantId,title:'Paper '+id,
 url:'https://doi.org/10.1000/'+id,source:'PubMed',
 type:'Journal article',category:'Research',
 journal:'Journal A',year:2024,pmid:String(90000+id),doi:'10.1000/'+id,
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null,
 ...changes
});
describe('14H140 recorded-source reconciliation: page-limited candidates only',()=>{
 it('never compares shared identifiers across different variants or outside the provided page',()=>{
  const a=source(1,'35',{doi:'10.1000/shared',pmid:'123'});
  const b=source(2,'19',{doi:'10.1000/shared',pmid:'123',year:2025});
  expect(evidenceReconciliationPage([a,b])).toEqual([]);
  expect(evidenceReconciliationPage([a])).toEqual([]);
  expect(evidenceReconciliationPage([])).toEqual([]);
 });
 it('normalizes DOI URL notation without producing a false different-DOI finding',()=>{
  const a=source(1,'35',{doi:'10.1000/Cftr',pmid:'123',year:2024});
  const b=source(2,'35',{doi:'https://doi.org/10.1000/cftr',pmid:'456',year:2025});
  const original=JSON.stringify([a,b]);
  const result=evidenceReconciliationPage([b,a]);
  expect(result).toHaveLength(1);
  expect(result[0].references.map(x=>x.id)).toEqual([1,2]);
  expect(result[0].matchingIdentifiers).toEqual(['DOI 10.1000/Cftr']);
  expect(result[0].observations.map(x=>[x.field,x.kind])).toEqual([
   ['pmid','different-values'],['title','different-values'],['year','different-values']
  ]);
  expect(result[0].observations[0].values).toEqual([
   {referenceId:1,value:'123'},{referenceId:2,value:'456'}
  ]);
  expect(JSON.stringify([a,b])).toBe(original);
  expect(Object.isFrozen(result)).toBe(true);
  expect(Object.isFrozen(result[0])).toBe(true);
  expect(Object.isFrozen(result[0].references)).toBe(true);
  expect(Object.isFrozen(result[0].observations[0].values[0])).toBe(true);
 });
 it('connects transitively through DOI then PMID, but does not make global identity claims',()=>{
  const a=source(1,'35',{doi:'10.1000/shared',pmid:'101',title:'Same title'});
  const b=source(2,'35',{doi:'10.1000/shared',pmid:'202',title:'Same title'});
  const c=source(3,'35',{doi:'10.1000/other',pmid:'202',title:'Same title'});
  const results=evidenceReconciliationPage([c,a,b]);
  expect(results).toHaveLength(1);
  expect(results[0].references.map(x=>x.id)).toEqual([1,2,3]);
  expect(results[0].matchingIdentifiers).toEqual(['DOI 10.1000/shared','PMID 202']);
  expect(results[0].observations.map(x=>x.field)).toEqual(['doi','pmid']);
  expect(results[0].observations.every(x=>x.kind==='different-values')).toBe(true);
  expect(Object.keys(results[0])).toEqual(['id','variantId','references','matchingIdentifiers','observations']);
 });
 it('separates an omitted identifier from a conflicting recorded identifier',()=>{
  const a=source(1,'35',{doi:null,pmid:'202',title:'Same',journal:null});
  const b=source(2,'35',{doi:'10.1000/shared',pmid:'202',title:'Same',journal:'Journal A'});
  const group=evidenceReconciliationPage([a,b])[0];
  expect(group.observations.map(x=>[x.field,x.kind])).toEqual([
   ['doi','not-recorded-in-all'],['journal','not-recorded-in-all']
  ]);
  expect(group.matchingIdentifiers).toEqual(['PMID 202']);
 });
 it('does not report exact duplicated metadata here; the existing repeat worklist remains',()=>{
  const a=source(1,'35',{doi:'10.1000/same',pmid:'123',title:'Same',year:2024});
  const b=source(2,'35',{doi:'https://doi.org/10.1000/same',pmid:'123',title:'same',year:2024});
  expect(evidenceReconciliationPage([a,b])).toEqual([]);
 });
 it('does not link records merely because titles, years or categories match',()=>{
  expect(evidenceReconciliationPage([
   source(1,'35',{title:'Same',pmid:null}),
   source(2,'35',{title:'Same',pmid:null})
  ])).toEqual([]);
 });
});
