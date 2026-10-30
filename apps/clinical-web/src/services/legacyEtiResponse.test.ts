import {describe,it,expect,vi} from 'vitest';
import {createLegacyEtiSource,decodeLegacyEtiRecord,recordedEtiLabel,recordedTherapyFlag} from './legacyEtiResponse';
const config={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_test123',enabled:true,accessMode:'anonymous' as const};
const row={
 id:18,eti_prediction:'non_responsive',therapy_responsive:false,
 eti_evidence_level:'in_vitro',eti_evidence_tier:null,
 eti_authority_source:null,cftr2_eti_response:null,last_evidence_update:'2026-10-14'
};
describe('14H1 · historical ETI response parity without medical inference',()=>{
 it('keeps recorded nonresponse category separate from legacy boolean flag',()=>{
  const record=decodeLegacyEtiRecord(row);
  expect(record.recordedEtiCategory).toBe('non_responsive');
  expect(record.legacyTherapyFlag).toBe(false);
  expect(recordedEtiLabel(record.recordedEtiCategory)).toContain('recorded legacy label');
  expect(recordedTherapyFlag(false)).toBe('No');
  expect(recordedTherapyFlag(true)).toBe('Yes');
  expect(recordedTherapyFlag(null)).toBe('Not recorded');
  expect(Object.isFrozen(record)).toBe(true);
 });
 it('preserves unknown, no record and disagreement instead of inventing response',()=>{
  expect(decodeLegacyEtiRecord({...row,eti_prediction:'unknown',therapy_responsive:true}).recordedEtiCategory).toBe('unknown');
  expect(decodeLegacyEtiRecord({...row,eti_prediction:null,therapy_responsive:null}).legacyTherapyFlag).toBeNull();
  expect(recordedEtiLabel(null)).toBe('No recorded ETI category');
 });
 it('rejects unexpected legacy labels, malformed types and dates',()=>{
  for(const bad of [
   {...row,eti_prediction:'eligible'}, {...row,therapy_responsive:'false'},
   {...row,last_evidence_update:'2026-02-31'}, {...row,eti_prediction:undefined},
   {...row,eti_authority_source:{role:'reviewed'}}, {...row,id:0}
  ])expect(()=>decodeLegacyEtiRecord(bad)).toThrow();
 });
 it('requests only selected response metadata and exact variant ID via GET',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify([row]),{status:200}));
  const result=await createLegacyEtiSource(config,transport as typeof fetch).get('18');
  expect(result?.id).toBe('18');
  const [raw,init]=transport.mock.calls[0] as unknown as [string,RequestInit];
  const url=new URL(raw);
  expect(url.pathname).toBe('/rest/v1/variants');
  expect(url.searchParams.get('id')).toBe('eq.18');
  expect(url.searchParams.get('limit')).toBe('2');
  expect(url.searchParams.get('select')).not.toContain('clinician_note');
  expect(url.searchParams.get('select')).not.toContain('therapy_responsive_drugs');
  expect(init.method).toBe('GET');
  expect(init.credentials).toBe('omit');
 });
 it('invalid IDs never leave the browser',async()=>{
  const transport=vi.fn();
  const source=createLegacyEtiSource(config,transport as typeof fetch);
  for(const id of ['0','018','18,19','-4','18;DELETE','1e3'])
   expect(await source.get(id)).toBeNull();
  expect(transport).not.toHaveBeenCalled();
 });
 it('rejects mismatch, duplicate record and malformed success response',async()=>{
  for(const payload of [[{...row,id:19}],[row,row],{rows:[row]}]){
   const transport=vi.fn(async()=>new Response(JSON.stringify(payload),{status:200}));
   await expect(createLegacyEtiSource(config,transport as typeof fetch).get('18'))
    .rejects.toMatchObject({code:'schema-mismatch'});
  }
  const empty=vi.fn(async()=>new Response('[]',{status:200}));
  expect(await createLegacyEtiSource(config,empty as typeof fetch).get('18')).toBeNull();
 });
 it('fails closed on unavailable or denied live data',async()=>{
  for(const [status,code] of [[403,'access-denied'],[500,'request-failed']] as const){
   const transport=vi.fn(async()=>new Response('{}',{status}));
   await expect(createLegacyEtiSource(config,transport as typeof fetch).get('18')).rejects.toMatchObject({code});
  }
 });
 it('authenticated sessions must supply real bearer token and never use client role claims',async()=>{
  const transport=vi.fn(async(_url:string,_init:RequestInit)=>new Response(JSON.stringify([row]),{status:200}));
  const restricted={...config,accessMode:'authenticated' as const};
  await expect(createLegacyEtiSource(restricted,transport as typeof fetch).get('18'))
    .rejects.toMatchObject({code:'authentication-required'});
  const source=createLegacyEtiSource(restricted,transport as typeof fetch,{
   getAccessToken:async()=> 'eyJhbGciOiJIUzI1NiJ9.e30.signature'
  });
  expect((await source.get('18'))?.recordedEtiCategory).toBe('non_responsive');
  const init=transport.mock.calls[0][1] as RequestInit;
  expect((init.headers as Record<string,string>).Authorization).toMatch(/^Bearer eyJ/);
 });
});
