import {describe,it,expect,vi} from 'vitest';
import {createAuthController} from './authSession';
function fakePort(){let emit:(event:string,session:any)=>void=()=>{};return {onAuthStateChange:vi.fn((fn:any)=>{emit=fn;return {data:{subscription:{unsubscribe(){}}}};}),getSession:vi.fn(async()=>({data:{session:null},error:null})),signInWithPassword:vi.fn(async()=>({data:{session:null},error:{message:'Invalid login'}})),signOut:vi.fn(async()=>({error:null})),emit:(session:any)=>emit('SIGNED_IN',session)};}
describe('real Supabase Auth controller states',()=>{
 it('starts signed out; sign-in errors expose no credentials',async()=>{const port=fakePort();const auth=createAuthController(port as any);await auth.initialize();expect(auth.state.phase).toBe('signed-out');expect(await auth.signIn('research@example.org','wrong')).toBe(false);expect(auth.state.message).toContain('Sign-in failed');});
 it('ignores stale session restoration when an auth event arrives later',async()=>{const port=fakePort();let release:((v:any)=>void)|undefined;port.getSession=vi.fn(()=>new Promise(r=>{release=r;})) as any;const auth=createAuthController(port as any);const loading=auth.initialize();port.emit({access_token:'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature',user:{email:'research@example.org'}});release!({data:{session:null},error:null});await loading;expect(auth.state.phase).toBe('signed-in');});
 it('clears visible state on sign-out',async()=>{const port=fakePort();const auth=createAuthController(port as any);port.emit({access_token:'test',user:{email:'research@example.org'}});expect(auth.state.phase).toBe('signed-in');await auth.signOut();expect(auth.state.phase).toBe('signed-out');});
});

describe('session-lookup revocation race',()=>{
 it('does not return a token resolved after local sign-out',async()=>{
  const port=fakePort();let release:((value:any)=>void)|undefined;
  port.getSession=vi.fn(()=>new Promise(done=>{release=done;})) as any;
  const auth=createAuthController(port as any);
  port.emit({access_token:'previous-token',user:{email:'research@example.org'}});
  const token=auth.getAccessToken();
  await auth.signOut();
  release!({data:{session:{access_token:'previous-token',user:{email:'research@example.org'}}},error:null});
  expect(await token).toBeNull();
  expect(auth.state.phase).toBe('signed-out');
 });
 it('never returns a token from an earlier user after an account switch',async()=>{
  const port=fakePort();let release:((value:any)=>void)|undefined;
  port.getSession=vi.fn(()=>new Promise(done=>{release=done;})) as any;
  const auth=createAuthController(port as any);
  port.emit({access_token:'first',user:{email:'first@example.org'}});
  const token=auth.getAccessToken();
  port.emit({access_token:'second',user:{email:'second@example.org'}});
  release!({data:{session:{access_token:'first',user:{email:'first@example.org'}}},error:null});
  expect(await token).toBeNull();
  expect(auth.state.email).toBe('second@example.org');
 });
 it('rejects a refreshed token belonging to a different user even without a change event',async()=>{
  const port=fakePort(),auth=createAuthController(port as any);
  const first='8ac7177e-4a91-4e69-a327-3709cb782117';
  const second='d71e38b6-3be3-426a-97a2-81b4cf4606b2';
  port.emit({access_token:'first',user:{id:first,email:'first@example.org'}});
  port.getSession=vi.fn(async()=>({data:{session:{access_token:'second',user:{id:second,email:'second@example.org'}}},error:null})) as any;
  expect(await auth.getAccessToken()).toBeNull();
  expect(auth.state.phase).toBe('signed-out');
  expect(auth.state.userId).toBeNull();
 });
 it('keeps a valid refreshed token for the same verified account',async()=>{
  const port=fakePort(),auth=createAuthController(port as any);
  const user='8ac7177e-4a91-4e69-a327-3709cb782117';
  port.emit({access_token:'old',user:{id:user,email:'research@example.org'}});
  port.getSession=vi.fn(async()=>({data:{session:{access_token:'fresh',user:{id:user,email:'research@example.org'}}},error:null})) as any;
  expect(await auth.getAccessToken()).toBe('fresh');
  expect(auth.state.phase).toBe('signed-in');
 });
 it('does not request a token before session establishment',async()=>{
  const port=fakePort(),auth=createAuthController(port as any);
  expect(await auth.getAccessToken()).toBeNull();
  expect(port.getSession).not.toHaveBeenCalled();
 });
});
