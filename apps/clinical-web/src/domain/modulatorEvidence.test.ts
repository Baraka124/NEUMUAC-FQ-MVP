import {describe,it,expect} from 'vitest';
import {decodeModulatorEvidence,describeEvidenceState} from './modulatorEvidence';
const regulatory={
 recordId:'review-test-001',modulator:'ETI',subjectKind:'variant',subjectId:'123',
 method:'regulatory-document',finding:'regulatory-text-only',jurisdiction:'EU',
 reviewState:'unreviewed',
 source:{authority:'EMA',documentTitle:'Example test document',documentUrl:'https://www.ema.europa.eu/en/medicines/human/EPAR/example',documentVersion:'test-version',
 publishedOn:'2026-01-01',retrievedOn:'2026-01-02',locationInDocument:'section 1'}
};
describe('modulator evidence is source-bound and cannot infer prescribing',()=>{
 it('keeps jurisdictional regulatory context separate from response',()=>{
  const result=decodeModulatorEvidence(regulatory);
  expect(result.finding).toBe('regulatory-text-only');
  expect(result.jurisdiction).toBe('EU');
  expect(Object.isFrozen(result.source)).toBe(true);
 });
 it('rejects an ETI response verdict attributed to regulatory documentation',()=>{
  expect(()=>decodeModulatorEvidence({...regulatory,finding:'reported-response'})).toThrow(/regulatory document/);
 });
 it('rejects EMA as source of US regulatory text',()=>{
  expect(()=>decodeModulatorEvidence({...regulatory,jurisdiction:'US'})).toThrow(/authority and jurisdiction/);
 });
 it('rejects all non-authority and plaintext links',()=>{
  expect(()=>decodeModulatorEvidence({...regulatory,source:{...regulatory.source,documentUrl:'https://evil.example/science'}})).toThrow();
  expect(()=>decodeModulatorEvidence({...regulatory,source:{...regulatory.source,documentUrl:'http://www.ema.europa.eu/science'}})).toThrow();
 });
 it('does not conflate laboratory response with regulatory approval',()=>{
  const x={...regulatory,method:'in-vitro-study',jurisdiction:'NOT_APPLICABLE',finding:'reported-response',source:{...regulatory.source,authority:'DOI',documentUrl:'https://doi.org/10.5555/example'}};
  expect(decodeModulatorEvidence(x).method).toBe('in-vitro-study');
  expect(()=>decodeModulatorEvidence({...x,jurisdiction:'EU'})).toThrow();
 });
 it('requires correct subject scope and source dates',()=>{
  expect(()=>decodeModulatorEvidence({...regulatory,subjectId:null})).toThrow();
  expect(()=>decodeModulatorEvidence({...regulatory,source:{...regulatory.source,publishedOn:'2026-02-10',retrievedOn:'2026-02-09'}})).toThrow();
 });
 it('does not treat absent records as evidence of nonresponse',()=>{
  expect(describeEvidenceState({state:'loaded',records:[]})).toMatch(/does not establish nonresponse/);
  expect(describeEvidenceState({state:'not-configured',records:[]})).toMatch(/not been connected/);
 });
});
