import {describe,it,expect} from 'vitest';
import {loadHeliosReviewList} from './heliosReadPort';
describe('Helios deny-by-default read connection',()=>{
 it('performs no network request when no authorized port is supplied',async()=>{
  expect(await loadHeliosReviewList()).toEqual({kind:'not-connected'});
 });
 it('does not show unknown responses, errors or malformed records',async()=>{
  expect(await loadHeliosReviewList({loadPublishedReviews:async()=>({privateData:'raw'})})).toEqual({kind:'access-denied'});
  expect(await loadHeliosReviewList({loadPublishedReviews:async()=>{throw Error('unauthorized')}})).toEqual({kind:'access-denied'});
  expect(await loadHeliosReviewList({loadPublishedReviews:async()=>[{reviewId:'invalid',variantId:'2',sourceReferences:[]}]})).toEqual({kind:'access-denied'});
 });
 it('distinguishes an empty authorized result and strips private fields',async()=>{
  expect(await loadHeliosReviewList({loadPublishedReviews:async()=>[]})).toEqual({kind:'empty'});
  const response=await loadHeliosReviewList({loadPublishedReviews:async()=>[{reviewId:'12',variantId:'7',recordedValue:null,proposedValue:null,evidenceSummary:null,uncertaintyNote:null,sourceReferences:[],claimedBy:'private'}]});
  expect(response.kind).toBe('ready');
  if(response.kind==='ready')expect(response.records[0]).not.toHaveProperty('claimedBy');
 });
});
