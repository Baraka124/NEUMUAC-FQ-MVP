import {describe,it,expect,vi} from 'vitest';
import {createAuthController} from './authSession';
const uid='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
function fakeAuth(){
 let listener:(event:string,session:any)=>void=()=>{};
 return {
  onAuthStateChange:vi.fn((fn:any)=>{listener=fn;return {data:{subscription:{unsubscribe(){}}}};}),
  getSession:vi.fn(async()=>({data:{session:null},error:null})),
  signInWithPassword:vi.fn(),signOut:vi.fn(async()=>({error:null})),
  setSession:vi.fn(async()=>({data:{session:{access_token:'verified',user:{id:uid,email:'invited@example.org'}}},error:null})),
  updateUser:vi.fn(async()=>({data:{user:{id:uid}},error:null})),
  emit:(session:any)=>listener('SIGNED_IN',session)
 };
}
describe('invitation activation credentials',()=>{
 it('establishes only a Supabase verified invitation session before password selection',async()=>{
  const port=fakeAuth(),controller=createAuthController(port as any);
  expect(await controller.establishInvitation({accessToken:'token',refreshToken:'refresh'})).toBe(true);
  expect(port.setSession).toHaveBeenCalledWith({access_token:'token',refresh_token:'refresh'});
  expect(controller.state.userId).toBe(uid);
  expect(await controller.chooseInvitationPassword('UniquePassword2026!')).toBe(true);
  expect(port.updateUser).toHaveBeenCalledWith({password:'UniquePassword2026!'});
 });
 it('never updates password without an established identity or with weak credentials',async()=>{
  const port=fakeAuth(),controller=createAuthController(port as any);
  expect(await controller.chooseInvitationPassword('UniquePassword2026!')).toBe(false);
  await controller.establishInvitation({accessToken:'token',refreshToken:'refresh'});
  expect(await controller.chooseInvitationPassword('123')).toBe(false);
  expect(port.updateUser).not.toHaveBeenCalled();
 });
 it('fails closed when token verification fails',async()=>{
  const port=fakeAuth();
  port.setSession=vi.fn(async()=>({data:{session:null},error:{message:'expired'}})) as any;
  const controller=createAuthController(port as any);
  expect(await controller.establishInvitation({accessToken:'expired',refreshToken:'expired'})).toBe(false);
  expect(controller.state.phase).not.toBe('signed-in');
  expect(port.updateUser).not.toHaveBeenCalled();
 });
 it('rejects password update results for an unexpected account',async()=>{
  const port=fakeAuth(),controller=createAuthController(port as any);
  await controller.establishInvitation({accessToken:'token',refreshToken:'refresh'});
  port.updateUser=vi.fn(async()=>({data:{user:{id:'11111111-1111-4111-8111-111111111111'}},error:null})) as any;
  expect(await controller.chooseInvitationPassword('UniquePassword2026!')).toBe(false);
 });
});
