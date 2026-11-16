import {describe,it,expect,vi} from 'vitest';
import {decodeResearchSourceSnapshot,createResearchSourceSnapshotReader} from './researchSourceSnapshot';
import type {ReadOnlyConfig} from './liveVariants';
const fixture={variant_id:'18',kind:'historical-records-only',
 reviewed_source_claims:'not-provided',archival:[{
  id:4,variant_id:'18',source_id:2,eti_response:'non_responsive',
  alyftrek_response:null,confidence:'medium',created_at:'2026-02-09T12:00:00Z'
 }],conflicts:[{
  id:8,variant_id:'18',field:'eti_prediction',severity:'high',
  resolved:true,detected_at:'2026-01-01T00:00:00Z',resolved_at:'2026-01-02T00:00:00Z'
 }],validations:[]};
const config:ReadOnlyConfig={endpoint:'https://research-contract.invalid',publishableKey:'sb_publishable_test_contract',
 enabled:true,accessMode:'anonymous',readTable:'variants'};
describe('14H165 strict research-source boundary',()=>{
 it('decodes only source-recorded historical flags, without promoting them to verified claims',()=>{
  const result=decodeResearchSourceSnapshot(fixture,'18');
  expect(result.variantId).toBe('18');
  expect(result.claimState).toBe('not-provided');
  expect(result.archivedEvidence[0].etiResponse).toBe('non_responsive');
  expect(result.history.conflicts[0].resolved).toBe(true);
 });
 it('fails closed for cross-variant data, incomplete results and corrupt archival fields',()=>{
  expect(()=>decodeResearchSourceSnapshot({...fixture,variant_id:'19'},'18')).toThrow();
  expect(()=>decodeResearchSourceSnapshot({...fixture,archival:null},'18')).toThrow();
  expect(()=>decodeResearchSourceSnapshot({...fixture,archival:[
   {...fixture.archival[0],eti_response:'predicted-good'}]},'18')).toThrow();
  expect(()=>decodeResearchSourceSnapshot({...fixture,archival:[{
   ...fixture.archival[0],variant_id:'19'}]},'18')).toThrow();
  expect(()=>decodeResearchSourceSnapshot({...fixture,archival:[
   fixture.archival[0],fixture.archival[0]]},'18')).toThrow();
 });
 it('requires a current signed-in research token and posts only canonical variant identity',async()=>{
  const transport=vi.fn(async(_url:string,init?:RequestInit)=>
   new Response(JSON.stringify(fixture),{status:200}));
  const session={getAccessToken:async()=>
   'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test-signature'};
  const reader=createResearchSourceSnapshotReader(config,session,transport as typeof fetch);
  const result=await reader.get('18');
  expect(result.claimState).toBe('not-provided');
  expect(transport).toHaveBeenCalledTimes(1);
  const [url,init]=transport.mock.calls[0];
  expect(url).toContain('/rest/v1/rpc/nfq_research_therapy_source_snapshot');
  expect(init?.method).toBe('POST');
  expect(JSON.parse(String(init?.body))).toEqual({p_variant_id:'18'});
 });
 it('never calls the network without a valid access token',async()=>{
  const transport=vi.fn();
  const reader=createResearchSourceSnapshotReader(config,{getAccessToken:async()=>null},transport as typeof fetch);
  await expect(reader.get('18')).rejects.toThrow();
  await expect(reader.get('01')).rejects.toThrow();
  expect(transport).not.toHaveBeenCalled();
 });
});
