import {describe,it,expect,vi} from 'vitest';
import {createResearchAccountDirectory,parseResearchAccountRows} from './researchAccountDirectory';
const admin='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
const config={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
const row={user_id:admin,account_email:'research@example.org',account_created_at:'2026-11-06T10:00:00Z',
 email_confirmed:true,research_role:'administrator',role_revoked_at:null};
function session(){return {state:{phase:'signed-in',userId:admin},getAccessToken:vi.fn(async()=> 'test-jwt')};}
describe('administrator research account roster',()=>{
 it('validates and normalizes only expected row shapes',()=>{
  expect(parseResearchAccountRows([row])[0]).toMatchObject({userId:admin,role:'administrator',revoked:false});
  expect(()=>parseResearchAccountRows([{...row,role:'owner',research_role:'owner'}])).toThrow();
  expect(()=>parseResearchAccountRows([{...row,user_id:'broken'}])).toThrow();
  expect(()=>parseResearchAccountRows([{...row,role_revoked_at:0}])).toThrow();
 });
 it('requires signed-in session and sends JWT to protected directory RPC',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify([row]),{status:200,headers:{'Content-Type':'application/json'}}));
  const auth=session();
  const data=await createResearchAccountDirectory(config,auth as any,transport as any).list('research');
  expect(data).toHaveLength(1);
  const [url,opts]=transport.mock.calls[0] as any;
  expect(url).toContain('/rest/v1/rpc/nfq_admin_list_research_accounts');
  expect(opts.method).toBe('POST');
  expect(opts.headers.Authorization).toBe('Bearer test-jwt');
  expect(JSON.parse(opts.body)).toEqual({p_search:'research',p_limit:50});
 });
 it('fails closed if session switches during token retrieval',async()=>{
  const auth=session();auth.getAccessToken.mockImplementation(async()=>{auth.state.userId='11111111-1111-4111-8111-111111111111';return 'test';});
  const transport=vi.fn();
  await expect(createResearchAccountDirectory(config,auth as any,transport as any).list(''))
   .rejects.toThrow(/Session changed/);
  expect(transport).not.toHaveBeenCalled();
 });
 it('does not return server-denied or malformed account data',async()=>{
  const denied=vi.fn(async()=>new Response(null,{status:403}));
  await expect(createResearchAccountDirectory(config,session() as any,denied as any).list(''))
   .rejects.toThrow(/not authorise/);
  const bad=vi.fn(async()=>new Response(JSON.stringify([{...row,account_email:123}]),{status:200}));
  await expect(createResearchAccountDirectory(config,session() as any,bad as any).list(''))
   .rejects.toThrow(/Invalid directory entry/);
 });
});
