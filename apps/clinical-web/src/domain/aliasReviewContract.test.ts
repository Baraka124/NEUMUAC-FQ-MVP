import {describe,it,expect} from 'vitest';
import {validateAliasReview,isScientificallyReviewedAlias,type AliasReviewRecord} from './aliasReviewContract';
const proposal:AliasReviewRecord={variantId:'18',alias:'DF508',sourceUri:'https://example.org/record/18',sourceLabel:'Scientific reference',submittedBy:'curator-one',submittedAt:'2026-10-18T00:00:00Z',state:'proposed'};
describe('scientific alias review contract',()=>{
 it('retains unreviewed suggestions as proposals, not approved synonyms',()=>{
  expect(validateAliasReview(proposal)).toEqual([]);
  expect(isScientificallyReviewedAlias(proposal)).toBe(false);
 });
 it('requires decision attribution, date and rationale before an approved status is valid',()=>{
  expect(isScientificallyReviewedAlias({...proposal,state:'approved'})).toBe(false);
  expect(isScientificallyReviewedAlias({...proposal,state:'approved',reviewedBy:'curator-two',reviewedAt:'2026-10-18T12:00:00Z',reviewRationale:'Verified source nomenclature'})).toBe(true);
 });
 it('rejects missing source and non-canonical record identifiers',()=>{
  expect(validateAliasReview({...proposal,variantId:'F508del',sourceUri:'http://invalid.example'}).length).toBeGreaterThan(0);
 });
});