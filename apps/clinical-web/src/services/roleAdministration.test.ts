import {describe,it,expect,vi} from 'vitest';
import {createRoleAdministrationClient,canManageResearchRoles,validateRoleAssignment} from './roleAdministration';
const admin='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
const target='22222222-2222-4222-8222-222222222222';
const cfg={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){return {state:{phase:'signed-in',userId:admin},getAccessToken:vi.fn(async()=> 'test-jwt')};}
describe('role administration',()=>{
 it('never enables the control without a verified administrator',()=>{
  expect(canManageResearchRoles('signed-in',{phase:'verified',role:'administrator'})).toBe(true);
  expect(canManageResearchRoles('signed-in',{phase:'verified',role:'reviewer'})).toBe(false);
  expect(canManageResearchRoles('signed-out',{phase:'verified',role:'administrator'})).toBe(false);
  expect(canManageResearchRoles('signed-in',{phase:'unassigned',role:null})).toBe(false);
 });
 it('rejects malformed accounts, unknown role and self revocation',()=>{
  expect(validateRoleAssignment('invalid','reviewer',false,admin)).toBe(false);
  expect(validateRoleAssignment(target,'owner',false,admin)).toBe(false);
  expect(validateRoleAssignment(admin,'reviewer',false,admin)).toBe(false);
  expect(validateRoleAssignment(admin,'administrator',true,admin)).toBe(false);
  expect(validateRoleAssignment(target,'contributor',true,admin)).toBe(true);
 });
 it('sends only the documented authenticated PostgreSQL RPC fields',async()=>{
  const transport=vi.fn(async()=>new Response(null,{status:204}));
  await createRoleAdministrationClient(cfg,session() as any,transport as any).setRole(target,'reviewer',false);
  expect(transport).toHaveBeenCalledTimes(1);
  const [url,request]=transport.mock.calls[0] as any;
  expect(url).toContain('/rest/v1/rpc/nfq_admin_set_member_role');
  expect(request.method).toBe('POST');
  expect(request.headers.Authorization).toBe('Bearer test-jwt');
  expect(JSON.parse(request.body)).toEqual({target_user_id:target,new_role:'reviewer',revoke_access:false});
 });
 it('does not send mutations if account switches before token retrieval',async()=>{
  const auth=session();auth.getAccessToken.mockImplementation(async()=>{auth.state.userId=target;return 'wrong-session';});
  const transport=vi.fn();
  await expect(createRoleAdministrationClient(cfg,auth as any,transport as any).setRole(target,'contributor',false))
   .rejects.toMatchObject({kind:'not-authorized'});
  expect(transport).not.toHaveBeenCalled();
 });
 it('fails closed on server rejection or uncertain network delivery',async()=>{
  const denied=vi.fn(async()=>new Response(null,{status:403}));
  await expect(createRoleAdministrationClient(cfg,session() as any,denied as any).setRole(target,'contributor',false))
   .rejects.toMatchObject({kind:'not-authorized'});
  const broken=vi.fn(async()=>{throw Error('network');});
  await expect(createRoleAdministrationClient(cfg,session() as any,broken as any).setRole(target,'administrator',false))
   .rejects.toMatchObject({kind:'uncertain'});
 });
});
