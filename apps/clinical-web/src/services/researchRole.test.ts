import {describe,expect,it} from 'vitest';
import {verifyMembershipRows} from './researchRole';

const account='8ac7177e-4a91-4e69-a327-3709cb782117';
const another='d71e38b6-3be3-426a-97a2-81b4cf4606b2';

describe('research membership verification',()=>{
 it('accepts a single, active admin role tied to the current account',()=>{
  expect(verifyMembershipRows([{user_id:account,role:'administrator',revoked_at:null}],account)).toEqual({phase:'verified',role:'administrator'});
 });
 it('accepts a research contributor without upgrading their role',()=>{
  expect(verifyMembershipRows([{user_id:account,role:'contributor',revoked_at:null}],account)).toEqual({phase:'verified',role:'contributor'});
 });
 it('does not accept a membership belonging to a different account',()=>{
  expect(verifyMembershipRows([{user_id:another,role:'administrator',revoked_at:null}],account)).toEqual({phase:'unavailable',role:null});
 });
 it('fails closed for missing subject, malformed values and ambiguous results',()=>{
  expect(verifyMembershipRows([{role:'administrator',revoked_at:null}],account).phase).toBe('unavailable');
  expect(verifyMembershipRows([{user_id:account,role:'owner',revoked_at:null}],account).phase).toBe('unavailable');
  expect(verifyMembershipRows([{user_id:account,role:'administrator',revoked_at:null},{user_id:another,role:'contributor',revoked_at:null}],account).phase).toBe('unavailable');
  expect(verifyMembershipRows({role:'administrator'},account).phase).toBe('unavailable');
 });
 it('treats a revoked membership as unassigned, never active',()=>{
  expect(verifyMembershipRows([{user_id:account,role:'administrator',revoked_at:'2026-10-01T12:00:00Z'}],account)).toEqual({phase:'unassigned',role:null});
  expect(verifyMembershipRows([],account)).toEqual({phase:'unassigned',role:null});
 });
});
