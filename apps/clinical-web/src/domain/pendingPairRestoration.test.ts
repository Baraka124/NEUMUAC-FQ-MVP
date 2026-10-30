import {describe,it,expect} from 'vitest';
import {pendingPairRestoration} from './pendingPairRestoration';
describe('14H21 signed-in genotype deep-link recovery',()=>{
 it('retries both missing deep-linked records after sign-in',()=>{
  expect(pendingPairRestoration(['1','35'],[null,null],'signed-in','authenticated')).toEqual([0,1]);
 });
 it('keeps loaded first variant while recovering second',()=>{
  expect(pendingPairRestoration(['1','35'],['1',null],'signed-in','authenticated')).toEqual([1]);
 });
 it('does not fetch for absent link, signed-out visitor or anonymous mode',()=>{
  expect(pendingPairRestoration(['1',null],[null,null],'signed-in','authenticated')).toEqual([0]);
  expect(pendingPairRestoration([null,null],[null,null],'signed-in','authenticated')).toEqual([]);
  expect(pendingPairRestoration(['1','35'],[null,null],'signed-out','authenticated')).toEqual([]);
  expect(pendingPairRestoration(['1','35'],[null,null],'signed-in','anonymous')).toEqual([]);
 });
 it('refreshes a conflicting stale selection only for the requested member',()=>{
  expect(pendingPairRestoration(['19','35'],['1','35'],'signed-in','authenticated')).toEqual([0]);
 });
});
