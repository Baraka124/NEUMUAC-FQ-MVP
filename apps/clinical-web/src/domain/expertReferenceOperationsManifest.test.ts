import {describe,it,expect} from 'vitest';
import {prepareBlindedReferenceBatch} from './blindedReferenceProtocol';
import {buildExpertReferenceOperationsManifest} from './expertReferenceOperationsManifest';
const assignments=[
 {caseId:'g551d-ivacaftor-2011',variantId:'11',curatorVerifiedVariantIdentity:true},
 {caseId:'phe508del-mf-eti-2019',variantId:'12',curatorVerifiedVariantIdentity:true},
 {caseId:'c1584ga-complex-allele-splicing-2020',variantId:'13',curatorVerifiedVariantIdentity:true}
];
describe('14H211 expert human handoff generation',()=>{
 it('creates exactly two blind work orders per anchored paper without claiming completion',()=>{
  const batch=prepareBlindedReferenceBatch(assignments);
  const report=buildExpertReferenceOperationsManifest(batch);
  expect(report.sourcePublications).toBe(3);
  expect(report.independentReviewSlots).toBe(6);
  expect(report.workOrders).toHaveLength(6);
  expect(report.workOrders.every(x=>x.reviewerAssigned===false&&
   x.expertResponseRecorded===false&&x.evidenceReviewed===false)).toBe(true);
  expect(report.realWorldExpertValidation).toBe(false);
  expect(report.canReleaseScientificAccuracy).toBe(false);
  expect(report.deploymentReady).toBe(false);
 });
 it('is stable independent of incoming packet order',()=>{
  const batch=prepareBlindedReferenceBatch(assignments);
  const reversed={...batch,challengePackets:[...batch.challengePackets].reverse()};
  expect(buildExpertReferenceOperationsManifest(batch))
   .toEqual(buildExpertReferenceOperationsManifest(reversed));
 });
 it('rejects packet leakage or invented review-completion status',()=>{
  const batch=prepareBlindedReferenceBatch([assignments[0]!]);
  expect(()=>buildExpertReferenceOperationsManifest({
   ...batch,independentReviewCompleted:true
  } as any)).toThrow();
  const leaked={...batch,challengePackets:[{
   ...batch.challengePackets[0]!,goldStandardAnswer:'supports'
  }]};
  expect(()=>buildExpertReferenceOperationsManifest(leaked as any)).toThrow();
 });
 it('keeps human review evidence requirements explicit',()=>{
  const report=buildExpertReferenceOperationsManifest(prepareBlindedReferenceBatch([assignments[2]!]));
  expect(report.requiredControls.join(' ')).toContain('independent');
  expect(report.workOrders.every(x=>x.requiredFields.some(f=>f.includes('complex-allele')))).toBe(true);
 });
});
