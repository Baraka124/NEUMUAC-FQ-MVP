import {describe,expect,it} from 'vitest';
import {projectVariantTherapies} from './therapyRegistry';
import {classIReviewSignals} from './classIReviewSignals';
import {buildTherapyReviewBrief} from './therapyReviewBrief';

const profile=projectVariantTherapies({
 id:'35',functionalClass:'I',classSubtype:'true',validationCount:0,
 eti:'non_responsive',alyftrek:'responsive',
 etiEvidenceLevel:'recorded',alyftrekEvidenceLevel:'recorded',
 etiEvidenceTier:'test',alyftrekEvidenceTier:'test',
 etiAuthority:null,alyftrekAuthority:null
});
describe('14H14 source-linked review packet preparation',()=>{
 it('retains the two different responses and all five regimens in a work brief',()=>{
  const result=buildTherapyReviewBrief(profile,classIReviewSignals(profile));
  expect(result).toContain('Variant record ID: 35');
  expect(result).toContain('ETI: non-responsive');
  expect(result).toContain('Alyftrek: responsive');
  expect(result).toContain('Kalydeco: Genotype rules only');
  expect(result).toContain('Symkevi / Symdeko: Genotype rules only');
  expect(result).toContain('Orkambi: Genotype rules only');
  expect(result).toContain('ETI and Alyftrek have different');
 });
 it('keeps the exceptional subtype independent from response',()=>{
  const x=projectVariantTherapies({...{
   id:'19',functionalClass:'I',classSubtype:'exceptional',validationCount:0,
   eti:'non_responsive' as const,alyftrek:'unknown' as const,etiEvidenceLevel:null,
   alyftrekEvidenceLevel:null,etiEvidenceTier:null,alyftrekEvidenceTier:null,
   etiAuthority:null,alyftrekAuthority:null
  }});
  expect(buildTherapyReviewBrief(x,classIReviewSignals(x))).toContain('Class subtype: exceptional');
  expect(buildTherapyReviewBrief(x,classIReviewSignals(x))).toContain('ETI: non-responsive');
 });
 it('never creates a packet from a malformed ID or incomplete profile',()=>{
  expect(()=>buildTherapyReviewBrief({...profile,variantId:'../bad'},[])).toThrow();
  expect(()=>buildTherapyReviewBrief({...profile,entries:profile.entries.slice(0,4)},[])).toThrow();
 });
});
