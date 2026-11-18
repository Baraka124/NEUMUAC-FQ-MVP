import {describe,it,expect} from 'vitest';
import {prepareBlindedReferenceBatch} from './blindedReferenceProtocol';
describe('14H207 blinded primary-publication reference protocol',()=>{
 const original=[
  {caseId:'phe508del-mf-eti-2019',variantId:'18',curatorVerifiedVariantIdentity:true},
  {caseId:'g551d-ivacaftor-2011',variantId:'19',curatorVerifiedVariantIdentity:true},
  {caseId:'c1584ga-complex-allele-splicing-2020',variantId:'20',curatorVerifiedVariantIdentity:true}
 ];
 it('creates reproducible bibliographic packets without exposing expected scientific answers',()=>{
  const a=prepareBlindedReferenceBatch(original);
  const b=prepareBlindedReferenceBatch([...original].reverse());
  expect(a).toEqual(b);
  expect(a.challengePackets.map(p=>p.pmid)).toEqual(['22047557','31697873','33375403']);
  expect(a.challengePackets.every(p=>p.goldStandardAnswer===null&&
   p.clinicallyActionable===false&&
   p.blinding==='independent-no-peer-finding-or-platform-verdict')).toBe(true);
  expect(a.independentReviewCompleted).toBe(false);
 });
 it('rejects unverified catalogue identities or fabricated publications',()=>{
  expect(()=>prepareBlindedReferenceBatch([
   {...original[0]!,curatorVerifiedVariantIdentity:false}
  ])).toThrow();
  expect(()=>prepareBlindedReferenceBatch([
   {...original[0]!,caseId:'unpublished-fictional-study'}
  ])).toThrow();
  expect(()=>prepareBlindedReferenceBatch([
   {...original[0]!,variantId:'c.1584G>A'}
  ])).toThrow();
 });
 it('does not silently duplicate reviewer workload for the same publication/variant',()=>{
  expect(()=>prepareBlindedReferenceBatch([original[0]!,original[0]!])).toThrow();
 });
 it('retains the complex-allele non-inference boundary',()=>{
  const batch=prepareBlindedReferenceBatch([original[2]!]);
  const notes=batch.challengePackets[0]!.nonInference.join(' ');
  expect(notes).toContain('No ETI or Alyftrek');
  expect(batch.challengePackets[0]!.requiredExtractionFields.join(' ')).toContain('complex-allele');
 });
});
