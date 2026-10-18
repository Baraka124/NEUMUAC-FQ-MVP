import {describe,it,expect} from 'vitest';
import {assessVariantQueryIntent,classifyResearchEvent,type SearchEventProof} from './variantQueryIntent';
const confirmed:SearchEventProof={kind:'confirmed-record',queryAtRead:'G551D',recordId:'383',
 recordedIdentities:['G551D','p.Gly551Asp'],fullRecordRead:true,dossierVisible:true};
const missing:SearchEventProof={kind:'completed-empty',queryAtRead:'c.1521_1523del',
 manuallyCommitted:true,readSucceeded:true,unfiltered:true,firstPage:true,hasMore:false,resultCount:0};
describe('Geographic search candidates must be genuine, completed research actions',()=>{
 it('never interprets typing, hints, result-list suggestions or partial matches as HIT',()=>{
  expect(classifyResearchEvent('G551D','matched')).toBe('excluded');
  expect(classifyResearchEvent('G551D','matched',{...confirmed,fullRecordRead:false})).toBe('excluded');
  expect(classifyResearchEvent('G551D','matched',{...confirmed,dossierVisible:false})).toBe('excluded');
  expect(classifyResearchEvent('G55','matched',{...confirmed,queryAtRead:'G55'})).toBe('excluded');
  expect(classifyResearchEvent('F508','matched',{...confirmed,queryAtRead:'F508',recordedIdentities:['F508del']})).toBe('excluded');
  expect(classifyResearchEvent('G551D','matched',{...confirmed,recordId:'0'})).toBe('excluded');
  expect(classifyResearchEvent('G551D','matched',{...confirmed,queryAtRead:'old'})).toBe('excluded');
 });
 it('marks a confirmed real dossier with an exact recorded identity as a hit CANDIDATE only',()=>{
  expect(classifyResearchEvent('g551d','matched',confirmed)).toBe('hit-candidate');
  expect(classifyResearchEvent('1001+11C/T','matched',{...confirmed,queryAtRead:'1001+11C/T',recordedIdentities:['1001+11C/T']})).toBe('hit-candidate');
 });
 it('does not count a temporary zero-result display as a genuine miss',()=>{
  expect(classifyResearchEvent('c.1521_1523del','unmatched')).toBe('excluded');
  for(const variation of [
   {manuallyCommitted:false},{readSucceeded:false},{unfiltered:false},{firstPage:false},
   {hasMore:true},{resultCount:1},{queryAtRead:'c.1521_1523delCTT'}
  ])expect(classifyResearchEvent('c.1521_1523del','unmatched',{...missing,...variation})).toBe('excluded');
 });
 it('can classify a deliberate, successful unfiltered zero-result query for later human review',()=>{
  expect(classifyResearchEvent('c.1521_1523del','unmatched',missing)).toBe('miss-review-candidate');
  expect(classifyResearchEvent('F508del','unmatched',{...missing,queryAtRead:'F508del'})).toBe('miss-review-candidate');
  expect(classifyResearchEvent('1001+11C/T','unmatched',{...missing,queryAtRead:'1001+11C/T'})).toBe('miss-review-candidate');
 });
 it('rejects noise, compound lists, ambiguous identities and service errors',()=>{
  for(const raw of ['hello','test','random text','patient F508del','https://example.com','G551D,F508del','F']){
   expect(classifyResearchEvent(raw,'unmatched',{...missing,queryAtRead:raw})).toBe('excluded');
  }
  for(const outcome of ['ambiguous','service-error','not-searched'] as const)
   expect(classifyResearchEvent('G551D',outcome,confirmed)).toBe('excluded');
  expect(classifyResearchEvent('G551D','matched',missing)).toBe('excluded');
  expect(classifyResearchEvent('G551D','unmatched',confirmed)).toBe('excluded');
 });
 it('recognizes recorded deletion and historical splice syntax as candidates without asserting a scientific match',()=>{
  expect(assessVariantQueryIntent('F508del')).toBe('well-formed-candidate');
  expect(assessVariantQueryIntent('1001+11C/T')).toBe('well-formed-candidate');
 });
});
