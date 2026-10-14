import {describe,it,expect} from 'vitest';
import {decideSearchInteraction,decideAnalyticsCandidate,type AnalyticsAuthorization} from './searchGovernance';
const allowed:AnalyticsAuthorization={analyticsEnabled:true,collectionAuthorized:true,minimizedInputApproved:true,actorAuthorized:true};
describe('independent search and analytics boundaries',()=>{
 it('never treats query rendering as collection approval',()=>{
  expect(decideSearchInteraction('G551D').disposition).toBe('search');
  expect(decideAnalyticsCandidate('G551D',{...allowed,collectionAuthorized:false}).eligibleCandidate).toBe(false);
  expect(decideAnalyticsCandidate('G551D',{...allowed,actorAuthorized:false}).eligibleCandidate).toBe(false);
  expect(decideAnalyticsCandidate('G551D',{...allowed,minimizedInputApproved:false}).eligibleCandidate).toBe(false);
  expect(decideAnalyticsCandidate('G551D',{...allowed,analyticsEnabled:false}).eligibleCandidate).toBe(false);
 });
 it('distinguishes navigable browse from unacceptable pasted text',()=>{
  expect(decideSearchInteraction('').disposition).toBe('browse');
  expect(decideSearchInteraction('G').disposition).toBe('browse');
  expect(decideSearchInteraction('https://example.test').disposition).toBe('reject');
  expect(decideSearchInteraction('name@example.test').disposition).toBe('reject');
  expect(decideSearchInteraction('patient treatment report').disposition).toBe('reject');
  expect(decideSearchInteraction('c.350G>A').disposition).toBe('search');
 });
 it('denies qualified or generic content for analytics even if search is available',()=>{
  expect(decideSearchInteraction('R117H carrier').disposition).toBe('search');
  expect(decideAnalyticsCandidate('R117H carrier',allowed).eligibleCandidate).toBe(false);
  expect(decideAnalyticsCandidate('G551D',allowed).eligibleCandidate).toBe(true);
  expect(decideAnalyticsCandidate('patient treatment report',allowed).eligibleCandidate).toBe(false);
 });
});
