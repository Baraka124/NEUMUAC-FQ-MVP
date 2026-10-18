import {describe,it,expect} from 'vitest';
import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {prepareConflictReviewPacket} from './conflictReviewPacket';
const h:ResearchHistory={validations:[],conflicts:[
 {id:7,variantId:'18',field:'functional_class',severity:'HIGH',resolved:false,detectedAt:null,resolvedAt:null},
 {id:8,variantId:'18',field:'source',severity:null,resolved:true,detectedAt:null,resolvedAt:null}
]};
const ref:LiveEvidenceReference={id:3,variantId:'18',title:'Recorded publication',url:'https://pubmed.ncbi.nlm.nih.gov/1234/',source:'PubMed',type:null,category:null,journal:null,year:null,pmid:'1234',doi:null,recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null};
describe('redacted conflict review preparation',()=>{
 it('exports only unresolved metadata and separates linked citations from conflict evidence',()=>{
  const packet=prepareConflictReviewPacket('18',h,[ref],true)!;
  expect(packet).toContain('Conflict #7');
  expect(packet).not.toContain('Conflict #8');
  expect(packet).toContain('Record #3');
  expect(packet).toContain('not been independently established');
  expect(packet).toContain('no approval or resolution');
 });
 it('refuses incomplete, mismatched, invalid or resolved-only history',()=>{
  expect(prepareConflictReviewPacket('18',h,[ref],false)).toBeNull();
  expect(prepareConflictReviewPacket('18',h,[{...ref,variantId:'19'}],true)).toBeNull();
  expect(prepareConflictReviewPacket('19',h,[ref],true)).toBeNull();
  expect(prepareConflictReviewPacket('18',{...h,conflicts:[h.conflicts[1]]},[ref],true)).toBeNull();
  expect(prepareConflictReviewPacket('18',{...h,conflicts:[{...h.conflicts[0],resolvedAt:'2026-10-19T00:00:00Z'}]},[ref],true)).toBeNull();
 });
});
