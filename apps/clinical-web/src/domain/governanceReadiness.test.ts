import {describe,it,expect} from 'vitest';
import {deriveGovernanceReadiness} from './governanceReadiness';
describe('14H146 strict governance UI eligibility',()=>{
 const contributor={phase:'verified' as const,role:'contributor' as const};
 const reviewer={phase:'verified' as const,role:'reviewer' as const};
 const administrator={phase:'verified' as const,role:'administrator' as const};
 it('does not claim authority based on sign-in alone or on a guest designation',()=>{
  for(const role of [
   {phase:'checking' as const,role:'administrator' as const},
   {phase:'unavailable' as const,role:'reviewer' as const},
   {phase:'unassigned' as const,role:null}
  ])expect(deriveGovernanceReadiness(true,role,true)).toMatchObject({membership:'not-verified',sourceReview:'not-verified',researchContribution:'not-verified',verified:false});
 });
 it('keeps contributor, reviewer, administrator scopes separate',()=>{
  expect(deriveGovernanceReadiness(true,contributor,true)).toMatchObject({membership:'not-verified',sourceReview:'not-verified',researchContribution:'eligible',verified:true});
  expect(deriveGovernanceReadiness(true,reviewer,true)).toMatchObject({membership:'not-verified',sourceReview:'eligible',researchContribution:'eligible',verified:true});
  expect(deriveGovernanceReadiness(true,administrator,true)).toMatchObject({membership:'eligible',sourceReview:'eligible',researchContribution:'eligible',verified:true});
 });
 it('does not grant access on missing configuration or signed-out sessions',()=>{
  expect(deriveGovernanceReadiness(true,administrator,false)).toMatchObject({membership:'not-verified',sourceReview:'not-verified',researchContribution:'not-verified'});
  expect(deriveGovernanceReadiness(false,administrator,true)).toMatchObject({membership:'not-verified',sourceReview:'not-verified',researchContribution:'not-verified'});
 });
});
