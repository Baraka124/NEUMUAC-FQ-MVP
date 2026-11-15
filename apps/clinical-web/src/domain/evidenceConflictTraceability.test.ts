import {describe,it,expect} from 'vitest';
import type {ResearchHistory} from '../services/liveResearchHistory';
import type {LiveEvidenceReference} from '../services/liveEvidence';
import {
 createEvidenceConflictTrace,prepareEvidenceConflictTraceability,traceRelationOptions,
 type EvidenceConflictTraceInput,type EvidenceConflictTraceEntry
} from './evidenceConflictTraceability';

const history:ResearchHistory={validations:[],conflicts:[
 {id:7,variantId:'18',field:'recorded_class',severity:'HIGH',resolved:false,
  detectedAt:'2026-10-01T11:00:00Z',resolvedAt:null},
 {id:8,variantId:'18',field:'older_citation',severity:'LOW',resolved:true,
  detectedAt:null,resolvedAt:null}
]};
const source:LiveEvidenceReference={
 id:3,variantId:'18',title:'Recorded PubMed publication',
 url:'https://pubmed.ncbi.nlm.nih.gov/1234/',source:'PubMed',
 type:'publication',category:'functional',journal:null,year:2026,
 pmid:'1234',doi:'10.1234/paper',recordedQualityScore:null,
 recordedSourceWeight:null,recordedCitationCount:null
};
const input:EvidenceConflictTraceInput={
 conflictId:7,referenceId:3,relation:'undetermined',
 question:'Does the referenced observation address the recorded class for this variant?',
 locator:'Results section · Table 2',
 interpretation:'Check the reported experiment and compare only the exact recorded field.'
};
const create=(raw:EvidenceConflictTraceInput=input,refs:readonly LiveEvidenceReference[]=[source],
 prior:readonly EvidenceConflictTraceEntry[]=[],complete=true)=>
 createEvidenceConflictTrace('18',history,refs,complete,raw,prior);

describe('14H148 explicit provisional evidence-to-conflict traceability',()=>{
 it('requires an explicit source+unresolved-record association before any local export exists',()=>{
  expect(prepareEvidenceConflictTraceability('18',history,[source],[],true)).toBeNull();
  const linked=create()!;
  expect(linked).toEqual({...input,variantId:'18'});
  const content=prepareEvidenceConflictTraceability('18',history,[source],[linked],true)!;
  expect(content).toContain('UNSUBMITTED PROVISIONAL RESEARCH NOTES');
  expect(content).toContain('conflict #7 / reference #3');
  expect(content).not.toContain('conflict #8 /');
  expect(content).toContain('Recorded PMID: 1234');
  expect(content).toContain('Recorded DOI: 10');
  expect(content).toContain('Exact source locator');
  expect(content).toContain('No database-stored conflict-to-reference relationship is established');
  expect(content).toContain('not a clinical priority');
  expect(content).not.toContain('Approval granted');
 });
 it('rejects unverified, foreign, resolved, duplicated or over-capacity associations',()=>{
  const prior=create()!;
  expect(create({...input,conflictId:8})).toBeNull();
  expect(create({...input,conflictId:999})).toBeNull();
  expect(create({...input,referenceId:77})).toBeNull();
  expect(create(input,[source],[prior])).toBeNull();
  expect(create(input,[source],[],false)).toBeNull();
  expect(create(input,[source,{...source,id:3}])).toBeNull();
  expect(create(input,[{...source,variantId:'19'}])).toBeNull();
  expect(create(input,[{...source,url:'https://not-allowed.invalid/story'}])).toBeNull();
  expect(create(input,[{...source,url:'http://pubmed.ncbi.nlm.nih.gov/1234/'}])).toBeNull();
  expect(create({...input,relation:'approved' as EvidenceConflictTraceInput['relation']})).toBeNull();
  expect(create(input,[source],Array.from({length:30},(_,i)=>({...prior,referenceId:i+10})))).toBeNull();
  expect(prepareEvidenceConflictTraceability('19',history,[source],[prior],true)).toBeNull();
  expect(prepareEvidenceConflictTraceability('18',history,[source],[prior],false)).toBeNull();
  expect(prepareEvidenceConflictTraceability('18',history,[source],[prior,prior],true)).toBeNull();
  expect(prepareEvidenceConflictTraceability('18',history,[source],[{...prior,variantId:'19'}],true)).toBeNull();
 });
 it('validates meaningfully complete user-entered source locators and interpretations',()=>{
  expect(create({...input,question:'Too short'})).toBeNull();
  expect(create({...input,locator:'x'})).toBeNull();
  expect(create({...input,interpretation:'Unexplained'})).toBeNull();
  expect(create({...input,question:'A sufficiently long question\n## New report heading'})).toBeNull();
  expect(create({...input,interpretation:'A sufficiently long note\u0007with control character'})).toBeNull();
  expect(create({...input,question:'x'.repeat(241)})).toBeNull();
  expect(create({...input,locator:'x'.repeat(181)})).toBeNull();
  expect(create({...input,interpretation:'x'.repeat(901)})).toBeNull();
  expect(traceRelationOptions).toHaveLength(4);
  for(const relation of traceRelationOptions){
   expect(create({...input,relation:relation.value})).not.toBeNull();
  }
 });
 it('quotes fake citations and headings as inert Markdown, never a signed finding',()=>{
  const inputWithClaims:EvidenceConflictTraceInput={
   ...input,question:'## Invented approval of a field <script>alert(1)</script>',
   locator:'Table 2 | https://example.invalid',
   interpretation:'*Verified* [approved](https://example.invalid) — this is only an author note.'
  };
  const entry=create(inputWithClaims,[{...source,title:'# Published source title <img src=x onerror=alert(1)>'}])!;
  const text=prepareEvidenceConflictTraceability('18',history,
   [{...source,title:'# Published source title <img src=x onerror=alert(1)>'}],[entry],true)!;
  expect(text).not.toContain('\n## Invented approval');
  expect(text).toContain('\\# Invented approval');
  expect(text).toContain('\\# Published source title');
  expect(text).not.toContain('[approved](https://example.invalid)');
  expect(text).not.toContain('<script>');
  expect(text).not.toContain('<img');
  expect(text).toContain('&lt;script&gt;');
  expect(text).toContain('&lt;img');
  expect(text).toContain('never a verified scientific determination');
 });
 it('rejects stale edits to previously sanitized notes before exporting',()=>{
  const entry=create()!;
  expect(prepareEvidenceConflictTraceability('18',history,[source],
   [{...entry,question:'New question without required checks'}],true)).not.toBeNull();
  expect(prepareEvidenceConflictTraceability('18',history,[source],
   [{...entry,question:'\tNot a valid question and forged entry'}],true)).toBeNull();
  expect(prepareEvidenceConflictTraceability('18',
   {...history,conflicts:[{...history.conflicts[0],resolved:true},history.conflicts[1]]},
   [source],[entry],true)).toBeNull();
 });
});
