import {describe,it,expect,vi} from 'vitest';
import {
 canOfferVariantCuration,canReviewVariantCuration,validCurationDraft,
 decodeVariantCurationQueue,validCurationDecision,createVariantCurationClient
} from './variantCuration';
const uuid='8ac7177e-4a91-4e69-a327-3709cb782117';
const reviewer='d71e38b6-3be3-426a-97a2-81b4cf4606b2';
const config={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
const draft={variantId:'42',field:'legacy_name' as const,proposedValue:'c.1521_1523delCTT',rationale:'The referenced canonical record uses this nomenclature.',sourceReference:'DOI:10.1111/fq.12345'};
const queueRow={
 id:17,variant_id:42,field_name:'legacy_name',recorded_value:'oldname',
 proposed_value:'c.1521_1523delCTT',rationale:draft.rationale,source_reference:draft.sourceReference,
 submitted_by:uuid,submitted_at:'2026-11-09T17:00:00Z',status:'submitted'
};
function session(user=uuid){
 return {state:{phase:'signed-in',userId:user},getAccessToken:vi.fn(async()=> 'verified-research-access-token')};
}
describe('14H122 variant curation permissions and validation',()=>{
 it('hides editing for guests, signed-out or unverified accounts',()=>{
  const admin={phase:'verified' as const,role:'administrator' as const};
  expect(canOfferVariantCuration(true,'signed-in',admin)).toBe(true);
  expect(canOfferVariantCuration(false,'signed-in',admin)).toBe(false);
  expect(canOfferVariantCuration(true,'signed-out',admin)).toBe(false);
  expect(canOfferVariantCuration(true,'signed-in',{phase:'unassigned',role:null})).toBe(false);
  expect(canReviewVariantCuration(true,'signed-in',{phase:'verified',role:'contributor'})).toBe(false);
  expect(canReviewVariantCuration(true,'signed-in',admin)).toBe(true);
 });
 it('permits only bounded, sourced, non-therapy fields',()=>{
  expect(validCurationDraft(draft)).toBe(true);
  expect(validCurationDraft({...draft,field:'eti_prediction' as any})).toBe(false);
  expect(validCurationDraft({...draft,rationale:'too short'})).toBe(false);
  expect(validCurationDraft({...draft,sourceReference:'none'})).toBe(false);
  expect(validCurationDraft({...draft,proposedValue:'bad\nfield'})).toBe(false);
 });
 it('rejects malformed and duplicate proposal identities',()=>{
  expect(decodeVariantCurationQueue([queueRow],'42')).toHaveLength(1);
  expect(()=>decodeVariantCurationQueue([queueRow,queueRow],'42')).toThrow();
  expect(()=>decodeVariantCurationQueue([{...queueRow,variant_id:43}],'42')).toThrow();
  expect(()=>decodeVariantCurationQueue([{...queueRow,status:'approved'}],'42')).toThrow();
  expect(()=>decodeVariantCurationQueue([{...queueRow,submitted_by:'wrong'}],'42')).toThrow();
 });
 it('forbids self review even with an Administrator interface role',()=>{
  const proposal=decodeVariantCurationQueue([queueRow],'42')[0];
  expect(validCurationDecision(proposal,'approved','Independent review confirms the source.',uuid)).toBe(false);
  expect(validCurationDecision(proposal,'approved','Independent review confirms the source.',reviewer)).toBe(true);
 });
 it('submits only bounded fields to the FQ RPC, never a direct variant PATCH',async()=>{
  const transport=vi.fn(async(_url:string,_init:RequestInit)=>new Response('27',{status:200}));
  const client=createVariantCurationClient(config,session() as any,transport as any);
  expect(await client.submit(draft)).toBe('27');
  const [url,init]=transport.mock.calls[0];
  expect(url).toBe('https://example.supabase.co/rest/v1/rpc/nfq_submit_variant_curation');
  expect(init.method).toBe('POST');
  expect(JSON.parse(String(init.body))).toEqual({
   p_variant_id:'42',p_field_name:'legacy_name',
   p_proposed_value:draft.proposedValue,
   p_rationale:draft.rationale,p_source_reference:draft.sourceReference
  });
  expect(String(init.body)).not.toContain('created_by');
 });
 it('fails closed on changed identity before the RPC request',async()=>{
  const identity=session();
  identity.getAccessToken.mockImplementation(async()=>{
   identity.state.userId=reviewer;return 'other-token';
  });
  const transport=vi.fn();
  await expect(createVariantCurationClient(config,identity as any,transport as any).submit(draft))
   .rejects.toMatchObject({kind:'not-authorized'});
  expect(transport).not.toHaveBeenCalled();
 });
 it('makes no automatic retry after an uncertain write',async()=>{
  const transport=vi.fn(async()=>{throw new Error('offline');});
  await expect(createVariantCurationClient(config,session() as any,transport as any).submit(draft))
   .rejects.toMatchObject({kind:'uncertain'});
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it('requires server-confirmed review with a different person',async()=>{
  const proposal=decodeVariantCurationQueue([queueRow],'42')[0];
  const transport=vi.fn(async(_url:string,_init:RequestInit)=>new Response('null',{status:200}));
  const client=createVariantCurationClient(config,session(reviewer) as any,transport as any);
  await client.decide(proposal,'approved','Independent source verification was completed.');
  expect(transport).toHaveBeenCalledTimes(1);
  expect(transport.mock.calls[0][0]).toBe('https://example.supabase.co/rest/v1/rpc/nfq_decide_variant_curation');
  expect(JSON.parse(String(transport.mock.calls[0][1].body))).toEqual({
   p_proposal_id:'17',p_decision:'approved',
   p_review_note:'Independent source verification was completed.'
  });
  await expect(createVariantCurationClient(config,session(uuid) as any,transport as any)
   .decide(proposal,'approved','I approve my own amendment.')).rejects.toMatchObject({kind:'invalid'});
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it('rejects an unexpected confirmation and wrong-variant queue',async()=>{
  const malformed=vi.fn(async()=>new Response('{"ok":true}',{status:200}));
  await expect(createVariantCurationClient(config,session() as any,malformed as any).submit(draft))
   .rejects.toMatchObject({kind:'uncertain'});
  const queueTransport=vi.fn(async()=>new Response(JSON.stringify([{...queueRow,variant_id:99}]),{status:200}));
  await expect(createVariantCurationClient(config,session() as any,queueTransport as any).pending('42'))
   .rejects.toMatchObject({kind:'unavailable'});
 });
});
