import {describe,expect,it,vi} from 'vitest';
import {canOfferSourceSubmission,createSourceCorrectionSubmission,SourceSubmissionError} from './sourceCorrectionSubmission';
import type {LiveEvidenceReference} from './liveEvidence';

const reference:LiveEvidenceReference={
 id:12,variantId:'42',title:'Recorded citation',
 url:'https://pubmed.ncbi.nlm.nih.gov/12345/',source:'PubMed',
 type:null,category:null,journal:null,year:2022,doi:null,pmid:'12345',
 recordedQualityScore:null,recordedSourceWeight:null,recordedCitationCount:null
};
const draft={reference,field:'year' as const,suggestedValue:'2023',rationale:'The published source lists 2023 instead.'};
const user='8ac7177e-4a91-4e69-a327-3709cb782117';
const config={endpoint:'https://example.supabase.co/',publishableKey:'sb_publishable_testkey',enabled:true};
function session(){
 return {state:{phase:'signed-in',userId:user},
  getAccessToken:vi.fn(async()=> 'research-user-token')};
}
describe('source correction gated submission',()=>{
 it('exposes no write when flag, session or verified role is absent',()=>{
  const role={phase:'verified' as const,role:'contributor' as const};
  expect(canOfferSourceSubmission(false,'signed-in',role)).toBe(false);
  expect(canOfferSourceSubmission(true,'signed-out',role)).toBe(false);
  expect(canOfferSourceSubmission(true,'signed-in',{phase:'unassigned',role:null})).toBe(false);
  expect(canOfferSourceSubmission(true,'signed-in',role)).toBe(true);
 });
 it('submits only the validated scientific correction via the intended RPC',async()=>{
  const request=vi.fn(async(_url:string,_init:RequestInit)=>new Response('27',{status:200}));
  const client=createSourceCorrectionSubmission(config,session() as any,request as any);
  expect(await client.submit(draft)).toBe('27');
  expect(request).toHaveBeenCalledTimes(1);
  const [url,init]=request.mock.calls[0];
  expect(url).toBe('https://example.supabase.co/rest/v1/rpc/nfq_submit_source_correction');
  expect(init.method).toBe('POST');
  expect(JSON.parse(String(init.body))).toEqual({
   p_reference_id:12,p_field_name:'year',p_proposed_value:'2023',
   p_rationale:draft.rationale
  });
  expect(String(init.body)).not.toContain('reviewed_by');
 });
 it('refuses invalid proposals without any network call',async()=>{
  const request=vi.fn();
  const client=createSourceCorrectionSubmission(config,session() as any,request as any);
  await expect(client.submit({...draft,rationale:'too short'})).rejects.toMatchObject({kind:'invalid'});
  expect(request).not.toHaveBeenCalled();
 });
 it('blocks a signed-out session before requesting a token',async()=>{
  const identity=session();identity.state.phase='signed-out';
  const request=vi.fn();
  const client=createSourceCorrectionSubmission(config,identity as any,request as any);
  await expect(client.submit(draft)).rejects.toMatchObject({kind:'not-authorized'});
  expect(identity.getAccessToken).not.toHaveBeenCalled();
  expect(request).not.toHaveBeenCalled();
 });
 it('blocks a switched identity before request dispatch',async()=>{
  const identity=session();
  identity.getAccessToken.mockImplementation(async()=>{identity.state.userId='d71e38b6-3be3-426a-97a2-81b4cf4606b2';return 'other-token';});
  const request=vi.fn();
  await expect(createSourceCorrectionSubmission(config,identity as any,request as any).submit(draft))
   .rejects.toMatchObject({kind:'not-authorized'});
  expect(request).not.toHaveBeenCalled();
 });
 it('does not report success or retry after a network failure',async()=>{
  const request=vi.fn(async()=>{throw Error('connection');});
  await expect(createSourceCorrectionSubmission(config,session() as any,request as any).submit(draft))
   .rejects.toMatchObject({kind:'uncertain'});
  expect(request).toHaveBeenCalledTimes(1);
 });
 it('fails closed on denied access and malformed confirmation',async()=>{
  const denied=vi.fn(async()=>new Response('{}',{status:403}));
  await expect(createSourceCorrectionSubmission(config,session() as any,denied as any).submit(draft))
   .rejects.toMatchObject({kind:'not-authorized'});
  const malformed=vi.fn(async()=>new Response('{"id":7}',{status:200}));
  await expect(createSourceCorrectionSubmission(config,session() as any,malformed as any).submit(draft))
   .rejects.toMatchObject({kind:'uncertain'});
 });
 it('rejects a changed session after a server response',async()=>{
  const identity=session();
  const request=vi.fn(async()=>{identity.state.phase='signed-out';return new Response('14',{status:200});});
  await expect(createSourceCorrectionSubmission(config,identity as any,request as any).submit(draft))
   .rejects.toMatchObject({kind:'uncertain'});
 });
});
