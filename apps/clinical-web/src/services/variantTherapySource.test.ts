import {describe,expect,it,vi} from 'vitest';
import {createVariantTherapySource,decodeVariantTherapyProfile} from './variantTherapySource';

const config={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_test',enabled:true,accessMode:'anonymous' as const};
const row={
 id:1,cftr_class:'I',class_subtype:'exceptional',validation_count:0,
 eti_prediction:'responsive',alyftrek_prediction:'unknown',
 eti_evidence_level:'real_world',alyftrek_evidence_level:null,
 eti_evidence_tier:null,alyftrek_evidence_tier:'class_rule',
 eti_authority_source:null,alyftrek_authority_source:'EU research label'
};
describe('14H11 exact-variant therapy source',()=>{
 it('decodes all five therapies while preserving two distinct recorded predictions',()=>{
  const data=decodeVariantTherapyProfile(row);
  expect(data.variantId).toBe('1');
  expect(data.functionalClass).toBe('I');
  expect(data.classSubtype).toBe('exceptional');
  expect(data.validationCount).toBe(0);
  expect(data.entries.map(x=>x.response)).toEqual(['responsive','unknown',null,null,null]);
  expect(data.entries[1].evidenceTier).toBe('class_rule');
 });
 it('keeps independently recorded historical JSON booleans separate from response fields',()=>{
  const data=decodeVariantTherapyProfile({...row,id:19,eti_prediction:'non_responsive',
   therapy_responsive_drugs:{eti:true}});
  expect(data.entries[0].response).toBe('non_responsive');
  expect(data.legacyDrugFlags).toEqual({eti:true,alyftrek:null});
  expect(()=>decodeVariantTherapyProfile({...row,therapy_responsive_drugs:{eti:'true'}})).toThrow();
 });
 it('accepts Class I exceptional with nonresponse and ordinary Class I with Alyftrek response',()=>{
  const g=decodeVariantTherapyProfile({...row,id:19,eti_prediction:'non_responsive'});
  expect(g.entries[0].response).toBe('non_responsive');
  const a=decodeVariantTherapyProfile({...row,id:35,class_subtype:'true',eti_prediction:'non_responsive',alyftrek_prediction:'responsive'});
  expect(a.entries[1].response).toBe('responsive');
 });
 it('keeps null distinct from unknown and zero validation count',()=>{
  const x=decodeVariantTherapyProfile({...row,eti_prediction:null,alyftrek_prediction:'unknown',validation_count:0});
  expect(x.entries[0].response).toBeNull();
  expect(x.entries[1].response).toBe('unknown');
  expect(x.validationCount).toBe(0);
 });
 it('rejects missing data fields, invalid IDs and unsupported response codes',()=>{
  const incomplete={...row} as Record<string,unknown>;delete incomplete.alyftrek_prediction;
  for(const bad of [incomplete,{...row,id:0},{...row,eti_prediction:'approved'}, {...row,validation_count:-1},{...row,class_subtype:{value:'exceptional'}}]){
   expect(()=>decodeVariantTherapyProfile(bad)).toThrow();
  }
 });
 it('fetches a single exact-ID profile using GET and narrowly selected fields',async()=>{
  const transport=vi.fn(async(_url:string,_init:RequestInit)=>new Response(JSON.stringify([row]),{status:200}));
  const result=await createVariantTherapySource(config,transport as typeof fetch).get('1');
  expect(result?.entries).toHaveLength(5);
  const [raw,opts]=transport.mock.calls[0],url=new URL(raw);
  expect(url.pathname).toBe('/rest/v1/variants');
  expect(url.searchParams.get('id')).toBe('eq.1');
  expect(url.searchParams.get('limit')).toBe('2');
  expect(url.searchParams.get('select')).toContain('alyftrek_prediction');
  expect(url.searchParams.get('select')).toContain('therapy_responsive_drugs');
  expect(url.searchParams.get('select')).not.toContain('clinician_note');
  expect(opts.method).toBe('GET');
  expect(opts.credentials).toBe('omit');
 });
 it('prevents variant mismatch, multirow response and malformed page',async()=>{
  for(const body of [[{...row,id:2}],[row,row],{rows:[row]}]){
   const transport=vi.fn(async()=>new Response(JSON.stringify(body),{status:200}));
   await expect(createVariantTherapySource(config,transport as typeof fetch).get('1'))
    .rejects.toMatchObject({code:'schema-mismatch'});
  }
 });
 it('does not request invalid IDs or construct clinical findings from missing rows',async()=>{
  const t=vi.fn();
  const source=createVariantTherapySource(config,t as typeof fetch);
  for(const id of ['0','01','1,2','1;DELETE','-1'])expect(await source.get(id)).toBeNull();
  expect(t).not.toHaveBeenCalled();
  const empty=vi.fn(async()=>new Response('[]',{status:200}));
  expect(await createVariantTherapySource(config,empty as typeof fetch).get('1')).toBeNull();
 });
 it('requires a staff token for authenticated reads',async()=>{
  const cfg={...config,accessMode:'authenticated' as const};
  const transport=vi.fn(async(_url:string,_opts:RequestInit)=>new Response(JSON.stringify([row]),{status:200}));
  await expect(createVariantTherapySource(cfg,transport as typeof fetch).get('1'))
   .rejects.toMatchObject({code:'authentication-required'});
  const source=createVariantTherapySource(cfg,transport as typeof fetch,{getAccessToken:async()=> 'eyJhbGciOiJIUzI1NiJ9.e30.signature'});
  expect((await source.get('1'))?.variantId).toBe('1');
  expect((transport.mock.calls[0][1].headers as Record<string,string>).Authorization).toMatch(/^Bearer eyJ/);
 });
});
