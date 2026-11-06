import {describe,it,expect,vi} from 'vitest';
import {createGuestDesignationClient,verifyGuestRows} from './guestDesignation';
const uid='8ece8970-74a4-4685-81a4-f885c8c78202';
const cfg={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){return {state:{phase:'signed-in',userId:uid},getAccessToken:vi.fn(async()=> 'bearer-jwt')};}
describe('explicit FQ guest designation',()=>{
 it('requires one exact verified active guest record',()=>{
  expect(verifyGuestRows([{user_id:uid,status:'active'}],uid)).toBe(true);
  expect(verifyGuestRows([],uid)).toBe(false);
  expect(()=>verifyGuestRows([{user_id:uid,status:'revoked'}],uid)).toThrow();
  expect(()=>verifyGuestRows([{user_id:'another',status:'active'}],uid)).toThrow();
  expect(()=>verifyGuestRows([{user_id:uid,status:'active'},{user_id:uid,status:'active'}],uid)).toThrow();
 });
 it('uses FQ JWT for a self-filtered readonly request',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify([{user_id:uid,status:'active'}]),{status:200}));
  const answer=await createGuestDesignationClient(cfg,session() as any,transport as any).readOwn();
  expect(answer).toBe(true);
  const [url,request]=transport.mock.calls[0] as any;
  expect(url).toContain('/rest/v1/nfq_guest_designations');
  expect(url).toContain('user_id=eq.');
  expect(request.method).toBe('GET');
  expect(request.headers.Authorization).toBe('Bearer bearer-jwt');
 });
 it('blocks session switches and denied responses',async()=>{
  const s=session();s.getAccessToken.mockImplementation(async()=>{s.state.userId='11111111-1111-4111-8111-111111111111';return 'jwt';});
  const transport=vi.fn();
  await expect(createGuestDesignationClient(cfg,s as any,transport as any).readOwn()).rejects.toThrow(/Session changed/);
  expect(transport).not.toHaveBeenCalled();
  const denied=vi.fn(async()=>new Response(null,{status:403}));
  await expect(createGuestDesignationClient(cfg,session() as any,denied as any).readOwn()).rejects.toThrow(/unavailable/);
 });
});
