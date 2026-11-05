import {describe,expect,it,vi} from 'vitest';
import {canDecideSourceCorrection,createSourceCorrectionDecisionClient,validateSourceDecision} from './sourceCorrectionDecision';
import type {SourceCorrectionReviewItem} from './sourceCorrectionReviewQueue';

const proposer='11111111-1111-4111-8111-111111111111';
const reviewer='22222222-2222-4222-8222-222222222222';
const item:SourceCorrectionReviewItem={
 id:'12',referenceId:'24',variantId:'4',field:'year',recordedValue:'2022',
 proposedValue:'2023',rationale:'Publication records the year 2023.',
 createdAt:'2026-11-05T17:00:00Z',createdBy:proposer
};
const cfg={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_public',enabled:true};
function session(){return {state:{phase:'signed-in',userId:reviewer},getAccessToken:vi.fn(async()=> 'verified-access-token')};}
describe('independent source-correction decisions',()=>{
 it('exposes the action only for an assigned, signed-in reviewer and enabled flag',()=>{
  expect(canDecideSourceCorrection(true,'signed-in',{phase:'verified',role:'reviewer'})).toBe(true);
  expect(canDecideSourceCorrection(true,'signed-in',{phase:'verified',role:'administrator'})).toBe(true);
  expect(canDecideSourceCorrection(true,'signed-in',{phase:'verified',role:'contributor'})).toBe(false);
  expect(canDecideSourceCorrection(false,'signed-in',{phase:'verified',role:'reviewer'})).toBe(false);
  expect(canDecideSourceCorrection(true,'signed-out',{phase:'verified',role:'reviewer'})).toBe(false);
 });
 it('rejects self-review, invalid decisions, and insufficient rationale',()=>{
  expect(validateSourceDecision(item,'accepted','The source was verified independently.',reviewer)).toBe(true);
  expect(validateSourceDecision(item,'accepted','The source was verified independently.',proposer)).toBe(false);
  expect(validateSourceDecision(item,'published' as 'accepted','The source was verified independently.',reviewer)).toBe(false);
  expect(validateSourceDecision(item,'rejected','too short',reviewer)).toBe(false);
 });
 it('sends exactly one independently authorised decision to the protected RPC',async()=>{
  const request=vi.fn(async(_url:string,_init:RequestInit)=>new Response(null,{status:204}));
  await createSourceCorrectionDecisionClient(cfg,session() as any,request as any)
   .decide(item,'accepted','Independent examination confirms the source.');
  expect(request).toHaveBeenCalledTimes(1);
  const [url,init]=request.mock.calls[0];
  expect(new URL(url).pathname).toBe('/rest/v1/rpc/nfq_review_source_correction');
  expect(init.method).toBe('POST');
  expect(JSON.parse(String(init.body))).toEqual({
   p_proposal_id:'12',p_decision:'accepted',
   p_review_note:'Independent examination confirms the source.'
  });
  expect(String(init.body)).not.toContain('published');
 });
 it('never dispatches when the session changes before the call',async()=>{
  const identity=session();
  identity.getAccessToken.mockImplementation(async()=>{
   identity.state.userId='33333333-3333-4333-8333-333333333333';return 'other-user-token';
  });
  const request=vi.fn();
  await expect(createSourceCorrectionDecisionClient(cfg,identity as any,request as any)
   .decide(item,'accepted','Scientific rationale confirms this correction.'))
   .rejects.toMatchObject({kind:'not-authorized'});
  expect(request).not.toHaveBeenCalled();
 });
 it('refuses self-review even before contacting the server',async()=>{
  const identity=session();identity.state.userId=proposer;const request=vi.fn();
  await expect(createSourceCorrectionDecisionClient(cfg,identity as any,request as any)
   .decide(item,'accepted','Independent rationale cannot come from the contributor.'))
   .rejects.toMatchObject({kind:'invalid'});
  expect(request).not.toHaveBeenCalled();
 });
 it('never retries uncertain writes and never claims success for errors',async()=>{
  const failed=vi.fn(async(_url:string,_init:RequestInit):Promise<Response>=>{throw Error('network');});
  await expect(createSourceCorrectionDecisionClient(cfg,session() as any,failed as any)
   .decide(item,'rejected','The source is inconsistent with the proposed year.'))
   .rejects.toMatchObject({kind:'uncertain'});
  expect(failed).toHaveBeenCalledTimes(1);
  const denied=vi.fn(async(_url:string,_init:RequestInit)=>new Response(null,{status:403}));
  await expect(createSourceCorrectionDecisionClient(cfg,session() as any,denied as any)
   .decide(item,'rejected','The proposal lacks independent supporting evidence.'))
   .rejects.toMatchObject({kind:'not-authorized'});
  const malformed=vi.fn(async(_url:string,_init:RequestInit)=>new Response('{"published":true}',{status:200}));
  await expect(createSourceCorrectionDecisionClient(cfg,session() as any,malformed as any)
   .decide(item,'accepted','Independent evidence supports this correction.'))
   .rejects.toMatchObject({kind:'uncertain'});
 });
});
