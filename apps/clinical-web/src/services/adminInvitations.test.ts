import {describe,it,expect,vi} from 'vitest';
import {createAdminInvitationClient,normalizedInviteAddress,parseInvitationRecords,InvitationOperationError} from './adminInvitations';

const admin='0dde93f1-cf9e-4143-8727-88e97ddd5f8d';
const cfg={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
const entry={
 id:'cd11b504-ed0e-4091-a71f-e2d5288c44c4',email:'clinician@example.org',kind:'clinician',
 status:'sent',createdAt:'2026-11-10T12:00:00Z',updatedAt:'2026-11-10T12:00:00Z'
};
function session(){
 return {state:{phase:'signed-in',userId:admin},getAccessToken:vi.fn(async()=> 'test-admin-jwt')};
}
describe('14H126 clinician invitations through the verified FQ Administrator session',()=>{
 it('normalizes invite addresses, never fabricates provider links',()=>{
  expect(normalizedInviteAddress(' Clinician@Example.ORG ')).toBe('clinician@example.org');
  expect(normalizedInviteAddress('bad')).toBeNull();
  expect(normalizedInviteAddress('clinician..extra@example.org')).toBeNull();
 });
 it('validates audit history and rejects untrusted or malformed statuses',()=>{
  expect(parseInvitationRecords({status:'ready',invitations:[entry]})).toEqual([entry]);
  expect(()=>parseInvitationRecords({status:'ready',invitations:[{...entry,status:'approved'}]})).toThrow();
  expect(()=>parseInvitationRecords({status:'ready',invitations:[{...entry,email:'not-an-email'}]})).toThrow();
  expect(()=>parseInvitationRecords({status:'ready',invitations:[{...entry,id:'fake-id'}]})).toThrow();
 });
 it('GET loads invitation history with user JWT and cannot send mail',async()=>{
  const transport=vi.fn(async(_url:string,opts:RequestInit)=>{
   expect(opts.method).toBe('GET');
   expect(opts.body).toBeUndefined();
   return new Response(JSON.stringify({status:'ready',invitations:[entry]}),{status:200});
  });
  const client=createAdminInvitationClient(cfg,session() as any,transport as any);
  expect((await client.list())[0].email).toBe('clinician@example.org');
  expect(transport).toHaveBeenCalledOnce();
  const [url,options]=transport.mock.calls[0] as any;
  expect(url).toContain('/functions/v1/nfq-admin-invite');
  expect(options.credentials).toBe('omit');
  expect(options.headers.Authorization).toBe('Bearer test-admin-jwt');
  expect(options.headers.apikey).toBe(cfg.publishableKey);
 });
 it('POST only sends explicitly normalized documented fields',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify({status:'invitation-requested'}),{status:202}));
  const client=createAdminInvitationClient(cfg,session() as any,transport as any);
  await client.send('  RESEARCHER@example.org  ','clinician');
  expect(transport).toHaveBeenCalledOnce();
  const [url,init]=transport.mock.calls[0] as any;
  expect(init.method).toBe('POST');
  expect(JSON.parse(init.body)).toEqual({email:'researcher@example.org',kind:'clinician'});
  expect(init.headers.Authorization).toBe('Bearer test-admin-jwt');
 });
 it('never dispatches malformed addresses or invalid invitation categories',async()=>{
  const transport=vi.fn();
  const client=createAdminInvitationClient(cfg,session() as any,transport as any);
  await expect(client.send('unsafe','clinician')).rejects.toBeInstanceOf(InvitationOperationError);
  await expect(client.send('staff@example.org','administrator' as never)).rejects.toBeInstanceOf(InvitationOperationError);
  expect(transport).not.toHaveBeenCalled();
 });
 it('refuses sign-out, account switch, and disabled backend',async()=>{
  const auth=session();
  auth.state.userId='11111111-1111-4111-8111-111111111111';
  auth.getAccessToken.mockImplementation(async()=>{auth.state.userId=admin;return 'expired';});
  const transport=vi.fn();
  const client=createAdminInvitationClient(cfg,auth as any,transport as any);
  await expect(client.send('staff@example.org','clinician')).rejects.toThrow(/Session changed/);
  expect(transport).not.toHaveBeenCalled();
  const offline=createAdminInvitationClient(cfg,session() as any,
    vi.fn(async()=>new Response(JSON.stringify({error:'disabled'}),{status:503})) as any);
  await expect(offline.list()).rejects.toMatchObject({status:503,uncertain:false});
 });
 it('treats uncertain delivery as no-retry; no bearer link returned to UI',async()=>{
  const rejected=createAdminInvitationClient(cfg,session() as any,
   vi.fn(async()=>new Response(JSON.stringify({error:'uncertain'}),{status:422})) as any);
  await expect(rejected.send('staff@example.org','guest')).rejects.toMatchObject({uncertain:true,status:422});
  const network=createAdminInvitationClient(cfg,session() as any,
   vi.fn(async()=>{throw Error('network disappeared');}) as any);
  await expect(network.send('staff@example.org','clinician')).rejects.toMatchObject({uncertain:true});
 });
});
