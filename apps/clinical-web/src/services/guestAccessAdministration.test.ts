import {describe,it,expect,vi} from 'vitest';
import {createGuestAccessAdminClient,parseGuestAccess,validGuestAccessAction} from './guestAccessAdministration';
const admin='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
const guest='4c9e2796-0c24-4487-9914-3cd351abc777';
const cfg={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){return {state:{phase:'signed-in',userId:admin},getAccessToken:vi.fn(async()=> 'test-jwt')};}
describe('14H129 independent Guest designation lifecycle',()=>{
 it('validates target, action and reason without allowing administrator self-designation',()=>{
  expect(validGuestAccessAction(guest,'grant','External study collaboration',admin)).toBe(true);
  expect(validGuestAccessAction(admin,'grant','A test reason',admin)).toBe(false);
  expect(validGuestAccessAction(guest,'revoke','short',admin)).toBe(false);
  expect(validGuestAccessAction(guest,'administrator','A test reason',admin)).toBe(false);
 });
 it('requires exactly one unambiguous Guest designation state',()=>{
  expect(parseGuestAccess([{is_active:false,designation_reason:null,designated_at:null}])).toEqual({active:false,reason:null,designatedAt:null});
  expect(parseGuestAccess([{is_active:true,designation_reason:'External study',designated_at:'2026-11-11T09:00:00Z'}]).active).toBe(true);
  expect(()=>parseGuestAccess([])).toThrow();
  expect(()=>parseGuestAccess([{is_active:'yes',designation_reason:null,designated_at:null}])).toThrow();
 });
 it('reads the protected RPC with signed-in actor token without changing a role',async()=>{
  const send=vi.fn(async()=>new Response(JSON.stringify([{is_active:false,designation_reason:null,designated_at:null}]),{status:200}));
  const svc=createGuestAccessAdminClient(cfg,session() as any,send as any);
  expect((await svc.read(guest)).active).toBe(false);
  const [url,init]=send.mock.calls[0] as any;
  expect(url).toContain('/rpc/nfq_admin_get_guest_access');
  expect(JSON.parse(init.body)).toEqual({p_user_id:guest});
  expect(init.headers.Authorization).toBe('Bearer test-jwt');
 });
 it('writes only audited Guest action fields after real session verification',async()=>{
  const send=vi.fn(async()=>new Response(null,{status:204}));
  const svc=createGuestAccessAdminClient(cfg,session() as any,send as any);
  await svc.set(guest,'grant','  Research observer access  ');
  const [url,init]=send.mock.calls[0] as any;
  expect(url).toContain('/rpc/nfq_admin_set_guest_access');
  expect(JSON.parse(init.body)).toEqual({p_user_id:guest,p_action:'grant',p_reason:'Research observer access'});
 });
 it('blocks unauthenticated/changed account and fails closed on denied operations',async()=>{
  const subject=session();const network=vi.fn();
  subject.getAccessToken.mockImplementation(async()=>{subject.state.userId=guest;return 'stale';});
  await expect(createGuestAccessAdminClient(cfg,subject as any,network as any).set(guest,'grant','Authorized observer')).rejects.toMatchObject({kind:'denied'});
  expect(network).not.toHaveBeenCalled();
  const denied=createGuestAccessAdminClient(cfg,session() as any,vi.fn(async()=>new Response(null,{status:403})) as any);
  await expect(denied.set(guest,'grant','Authorized observer')).rejects.toMatchObject({kind:'denied'});
 });
 it('treats transport uncertainty as no-retry for an action with side effects',async()=>{
  const svc=createGuestAccessAdminClient(cfg,session() as any,vi.fn(async()=>{throw Error('network');}) as any);
  await expect(svc.set(guest,'revoke','Ending external project access')).rejects.toMatchObject({kind:'uncertain'});
 });
});
