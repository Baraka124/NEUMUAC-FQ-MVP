import {describe,it,expect} from 'vitest';
import {readInvitationReturn,validActivationPassword} from './invitationReturn';
describe('invitation return boundary',()=>{
 it('accepts a single explicit invite fragment only',()=>{
  expect(readInvitationReturn('#access_token=abc.def.ghi&refresh_token=xyz&type=invite'))
   .toEqual({kind:'invite',tokens:{accessToken:'abc.def.ghi',refreshToken:'xyz'}});
 });
 it('recognises password recovery only with verified session tokens',()=>{
  expect(readInvitationReturn('#access_token=abc&refresh_token=def&type=recovery')).toEqual({kind:'recovery',tokens:{accessToken:'abc',refreshToken:'def'}});
 });
 it('rejects unrelated fragments and route fragments',()=>{
  for(const hash of ['#/admin','#/activate',
   '#access_token=a&refresh_token=b&type=signup','#access_token=a&refresh_token=b'])
   expect(readInvitationReturn(hash)).toEqual({kind:'none'});
 });
 it('blocks malformed invites and duplicate token keys',()=>{
  expect(readInvitationReturn('#type=invite&error=access_denied')).toEqual({kind:'error'});
  expect(readInvitationReturn('#type=invite&access_token=abc')).toEqual({kind:'error'});
  expect(readInvitationReturn('#type=invite&access_token=a&access_token=b&refresh_token=c')).toEqual({kind:'error'});
 });
 it('requires a strong password without control characters',()=>{
  expect(validActivationPassword('GoodUniquePassword2026!')).toBe(true);
  expect(validActivationPassword('short')).toBe(false);
  expect(validActivationPassword('TwelveLong\nBad')).toBe(false);
 });
});
