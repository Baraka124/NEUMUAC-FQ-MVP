import {describe,it,expect} from 'vitest';
import {classifyGuest,resolveProfessionalProfile,canIndependentlyReview,requiresPrivilegedAccountOperation} from './professionalIdentity';
const a='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
const b='11111111-1111-4111-8111-111111111111';
const p='22222222-2222-4222-8222-222222222222';
const q='33333333-3333-4333-8333-333333333333';
describe('verified neumACt affiliation',()=>{
 it('recognises only an exact verified neumDESK-to-FQ identity link',()=>{
  const link={fqAuthUserId:a,deskStaffId:p,status:'verified' as const,source:'neumdesk' as const,verifiedAt:'2026-11-06T14:00:00Z'};
  expect(resolveProfessionalProfile(a,link,'  Researcher  ')).toEqual({affiliation:'member',deskStaffId:p,displayName:'Researcher',researchGroup:'neumACt'});
  expect(resolveProfessionalProfile(b,link,'Researcher').affiliation).toBe('unverified');
  expect(resolveProfessionalProfile(a,{...link,status:'revoked'},'Researcher').affiliation).toBe('unverified');
  expect(resolveProfessionalProfile(a,{...link,deskStaffId:'broken'},'Researcher').affiliation).toBe('unverified');
  expect(resolveProfessionalProfile(a,null,'Researcher').displayName).toBeNull();
 });
 it('does not equate failed affiliation lookup with verified guest designation',()=>{
  expect(classifyGuest(false,false)).toBe('unverified');
  expect(classifyGuest(true,false)).toBe('guest');
  expect(classifyGuest(true,true)).toBe('member');
 });
});
describe('human independent scientific review',()=>{
 it('blocks one person with multiple accounts even when UUIDs differ',()=>{
  expect(canIndependentlyReview(a,b,p,p)).toBe(false);
  expect(canIndependentlyReview(a,a,p,q)).toBe(false);
  expect(canIndependentlyReview(a,b,null,q)).toBe(false);
  expect(canIndependentlyReview(a,b,p,null)).toBe(false);
  expect(canIndependentlyReview(a,b,p,q)).toBe(true);
 });
});
describe('credential lifecycle',()=>{
 it('distinguishes self-service recovery from privileged operations',()=>{
  expect(requiresPrivilegedAccountOperation('reset-password')).toBe(false);
  for(const action of ['invite','resend-invite','revoke-sessions','suspend','reactivate'] as const)
   expect(requiresPrivilegedAccountOperation(action)).toBe(true);
 });
});
