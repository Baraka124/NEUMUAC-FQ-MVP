import {describe,it,expect,vi} from 'vitest';
import {decodeMolecularDiscoveryPage,createMolecularDiscoveryService} from './molecularDiscoveryService';
import type {ReadOnlyConfig} from './liveVariants';
const record={
 id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
 seriesId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 revision:1,variantId:'18',
 sourceClaimId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
 categories:['rna-splicing','trafficking'],
 interpretation:'mechanistic-hypothesis',
 statement:'The experimental source discusses a potential transcript-processing defect in this CFTR variant.',
 exactLocator:'Original source Figure 2 and Methods',
 experimentalContext:'Original epithelial-cell assay with a clearly identified CFTR variant.',
 limitations:'Functional rescue and clinical outcomes are not established by this study.',
 submittedAt:'2026-11-17T17:00:00Z',referenceId:71,
 studyFamilyId:'study-18',therapy:'ETI',
 sourceTitle:'Recorded original publication',sourceUrl:'https://pubmed.ncbi.nlm.nih.gov/12345678/',
 legacyName:'1716G/A',cdnaName:'c.1584G>A',proteinName:'p.Glu528=',recordedClass:'II'
};
const scope={category:null,variantId:null,limit:20,offset:0};
const envelope=(records:unknown[],overrides:Record<string,unknown>={})=>({
 source:'nfq-approved-molecular-discovery-v1',
 category:null,variantId:null,limit:20,offset:0,hasMore:false,records,...overrides
});
const config:ReadOnlyConfig={
 endpoint:'https://cftr-contract.invalid',publishableKey:'sb_publishable_test_contract',
 enabled:true,accessMode:'anonymous',readTable:'variants'
};
const token=['eyJhbGciOiJIUzI1NiJ9','eyJzdWIiOiJ0ZXN0In0','test'].join('.');
describe('14H189–190 strictly approved molecular evidence discovery',()=>{
 it('keeps exact CFTR notations and original source provenance, never class similarity as identity',()=>{
  const page=decodeMolecularDiscoveryPage(envelope([record]),scope);
  expect(page.scope).toBe('independently-reviewed-research-only');
  expect(page.entries[0]?.cdnaName).toBe('c.1584G>A');
  expect(page.entries[0]?.sourceClaimId).toBe(record.sourceClaimId);
  expect(page.entries[0]?.categories).toEqual(['rna-splicing','trafficking']);
  expect(page.entries[0]?.therapy).toBe('ETI');
 });
 it('rejects cross-variant identity leaks and wrong mechanism scope',()=>{
  expect(()=>decodeMolecularDiscoveryPage(envelope([record]),{
   ...scope,variantId:'19'
  })).toThrow();
  expect(()=>decodeMolecularDiscoveryPage(envelope([record],{
   category:'channel-gating'
  }),{...scope,category:'channel-gating'})).toThrow();
  expect(()=>decodeMolecularDiscoveryPage(envelope([record],{
   variantId:'18'
  }),scope)).toThrow();
 });
 it('rejects duplicate claims, malformed provenance, non-source URLs, incomplete pagination',()=>{
  expect(()=>decodeMolecularDiscoveryPage(envelope([record,record]),scope)).toThrow();
  expect(()=>decodeMolecularDiscoveryPage(envelope([{...record,sourceUrl:'javascript:alert(1)'}]),scope)).toThrow();
  expect(()=>decodeMolecularDiscoveryPage(envelope([{...record,sourceClaimId:'invalid'}]),scope)).toThrow();
  expect(()=>decodeMolecularDiscoveryPage(envelope([],{
   hasMore:true
  }),scope)).toThrow();
 });
 it('allows an empty, verified register without inventing mechanism observations',()=>{
  const page=decodeMolecularDiscoveryPage(envelope([]),scope);
  expect(page.entries).toHaveLength(0);
  expect(page.hasMore).toBe(false);
 });
 it('requires an actual researcher session token before contacting source API',async()=>{
  const transport=vi.fn() as unknown as typeof fetch;
  const api=createMolecularDiscoveryService(config,{getAccessToken:async()=>null},transport);
  await expect(api.search(scope)).rejects.toThrow();
  expect(vi.mocked(transport)).not.toHaveBeenCalled();
 });
 it('denies 403 and verifies exact structured RPC filters',async()=>{
  const denied=vi.fn(async()=>new Response('',{status:403})) as unknown as typeof fetch;
  const api=createMolecularDiscoveryService(config,{getAccessToken:async()=>token},denied);
  await expect(api.search(scope)).rejects.toThrow();
  expect(vi.mocked(denied)).toHaveBeenCalledTimes(1);
  const good=vi.fn(async (_url:unknown,init?:RequestInit)=>new Response(
   JSON.stringify(envelope([record])),{status:200,headers:{'content-type':'application/json'}}
  )) as unknown as typeof fetch;
  const client=createMolecularDiscoveryService(config,{getAccessToken:async()=>token},good);
  const result=await client.search(scope);
  expect(result.entries).toHaveLength(1);
  const args=vi.mocked(good).mock.calls[0];
  const payload=JSON.parse(String(args?.[1]?.body));
  expect(payload.p_category).toBeNull();
  expect(payload.p_variant_id).toBeNull();
  expect(payload.p_limit).toBe(20);
  expect(payload.p_offset).toBe(0);
 });
});
