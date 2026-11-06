import {describe,it,expect,vi} from 'vitest';
import {createResearchAccessDiagnostic} from './researchAccessDiagnostic';
const user='11111111-1111-4111-8111-111111111111';
const other='22222222-2222-4222-8222-222222222222';
const cfg={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){return {state:{phase:'signed-in',userId:user},getAccessToken:vi.fn(async()=> 'account-token')};}
function responder(role:'contributor'|'reviewer'|'administrator'|null,proposals:unknown[]=[],identity=user){
 return vi.fn(async(url:string,init:RequestInit)=>{
  if(init.method!=='GET'||init.body||!String(init.headers&&JSON.stringify(init.headers)).includes('account-token'))
   throw Error('Unexpected method or token');
  if(url.endsWith('/auth/v1/user'))return new Response(JSON.stringify({id:identity}),{status:200});
  if(url.includes('/nfq_research_memberships'))return new Response(JSON.stringify(role?[{user_id:user,role,revoked_at:null}]:[]),{status:200});
  if(url.includes('/nfq_source_correction_proposals'))return new Response(JSON.stringify(proposals),{status:200});
  throw Error('Unknown request');
 });
}
describe('research access diagnostic',()=>{
 it('verifies authenticated identity, assigned membership and own-only contributor reads',async()=>{
  const fetcher=responder('contributor',[{id:7,created_by:user}]);
  const result=await createResearchAccessDiagnostic(cfg,session() as any,fetcher as any).check();
  expect(result).toEqual({subject:user,role:'contributor',membership:'verified',proposalVisibility:'checked',privateProposalCount:1});
  expect(fetcher).toHaveBeenCalledTimes(3);
  for(const [,init] of fetcher.mock.calls)expect(init.method).toBe('GET');
 });
 it('verifies unassigned account with no proposal visibility',async()=>{
  const result=await createResearchAccessDiagnostic(cfg,session() as any,responder(null) as any).check();
  expect(result.membership).toBe('unassigned');
  expect(result.privateProposalCount).toBe(0);
 });
 it('rejects a server identity mismatch before reading private tables',async()=>{
  const fetcher=responder(null,[],other);
  await expect(createResearchAccessDiagnostic(cfg,session() as any,fetcher as any).check())
   .rejects.toMatchObject({kind:'invalid'});
  expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('rejects cross-account proposal visibility for unassigned and contributor sessions',async()=>{
  for(const role of [null,'contributor'] as const){
   await expect(createResearchAccessDiagnostic(cfg,session() as any,responder(role,[{id:1,created_by:other}]) as any).check())
    .rejects.toMatchObject({kind:'invalid'});
  }
 });
 it('allows an assigned reviewer to inspect proposal records owned by another account',async()=>{
  const result=await createResearchAccessDiagnostic(cfg,session() as any,
   responder('reviewer',[{id:1,created_by:other}]) as any).check();
  expect(result.role).toBe('reviewer');
 });
 it('refuses a changed account before requests begin',async()=>{
  const identity=session();
  identity.getAccessToken.mockImplementation(async()=>{identity.state.userId=other;return 'wrong-token';});
  const fetcher=vi.fn();
  await expect(createResearchAccessDiagnostic(cfg,identity as any,fetcher as any).check())
   .rejects.toMatchObject({kind:'session'});
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('rejects excessive records, malformed IDs and a denied server response',async()=>{
  const many=Array.from({length:21},(_,i)=>({id:i+1,created_by:user}));
  await expect(createResearchAccessDiagnostic(cfg,session() as any,responder('contributor',many) as any).check())
   .rejects.toMatchObject({kind:'invalid'});
  await expect(createResearchAccessDiagnostic(cfg,session() as any,responder('contributor',[{id:0,created_by:user}]) as any).check())
   .rejects.toMatchObject({kind:'invalid'});
  const denied=vi.fn(async()=>new Response(null,{status:401}));
  await expect(createResearchAccessDiagnostic(cfg,session() as any,denied as any).check())
   .rejects.toMatchObject({kind:'denied'});
 });
});
