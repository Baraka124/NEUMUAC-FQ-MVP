import {describe,it,expect} from 'vitest';
import {assessReviewBackendReadiness,REVIEW_SECURITY_REQUIREMENTS,TRUSTED_REVIEW_WRITE_CONNECTION,type ReviewBackendEvidence} from './reviewBackendReadiness';
const passing=Object.fromEntries(REVIEW_SECURITY_REQUIREMENTS.map(key=>[key,true])) as unknown as ReviewBackendEvidence;
describe('Phase 14D trusted server acceptance gate (not client authorization)',()=>{
 it('defaults to denied without a verified backend',()=>{
  expect(assessReviewBackendReadiness(null).ready).toBe(false);
  expect(assessReviewBackendReadiness({}).ready).toBe(false);
  expect(TRUSTED_REVIEW_WRITE_CONNECTION).toBe('not-connected');
 });
 it('refuses omission of any single independently required control',()=>{
  for(const key of REVIEW_SECURITY_REQUIREMENTS){
   const result=assessReviewBackendReadiness({...passing,[key]:false});
   expect(result).toMatchObject({ready:false,missing:[key]});
  }
 });
 it('rejects client-style truthy strings and unaudited role-only authorizations',()=>{
  const falsified=Object.fromEntries(REVIEW_SECURITY_REQUIREMENTS.map(key=>[key,'true']));
  expect(assessReviewBackendReadiness(falsified as Partial<ReviewBackendEvidence>).ready).toBe(false);
  expect(assessReviewBackendReadiness({trustedIdentityDerivedOnServer:true,reviewerRolesServerVerified:true}).ready).toBe(false);
 });
 it('represents complete signed-off evidence as eligible for separate trusted implementation, not activating it',()=>{
  expect(assessReviewBackendReadiness(passing)).toEqual({ready:true,missing:[]});
  expect(TRUSTED_REVIEW_WRITE_CONNECTION).toBe('not-connected');
 });
});
