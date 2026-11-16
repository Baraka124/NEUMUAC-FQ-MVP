import {describe,it,expect,vi} from 'vitest';
import {
 canonicalCFTRGnomadVariantId,GNOMAD_POPULATION_QUERY,gnomadPopulationQueryBody,
 decodeGnomadPopulationResponse,fetchGnomadPopulationReference,
 GNOMAD_ENDPOINT
} from './gnomadPopulationReference';

const id='7-117559590-ATCT-A';
const ok=(variant:unknown)=>({data:{variant}});
const source={
 variant_id:id,reference_genome:'GRCh38',
 genome:{
  ac:2,an:1000,af:0.002,
  populations:[
   {id:'nfe',ac:1,an:250,af:0.004},
   {id:'afr',ac:0,an:200,af:0},
   {id:'fin',ac:0,an:0,af:null}
  ]
 },
 exome:{ac:4,an:2000,af:0.002,populations:[{id:'afr',ac:1,an:500,af:0.002}]}
};
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{
 status,headers:{'Content-Type':'application/json'}
});

describe('14H160 original-source gnomAD scientific boundary',()=>{
 it('accepts only explicitly typed GRCh38 chr7 alleles',()=>{
  expect(canonicalCFTRGnomadVariantId(id,'GRCh38')).toBe(id);
  for(const raw of ['rs123','p.Phe508del','c.1521_1523delCTT','chr7-117559590-ATCT-A',
   '7-0-A-G','7-0001-A-G','7-117559590-A-A',
   '7-117559590-ATCT-A"} mutation {','7-159345974-A-T','1-117559590-A-T',
   '',undefined,null,[],{}])
   expect(canonicalCFTRGnomadVariantId(raw,'GRCh38')).toBeNull();
  expect(canonicalCFTRGnomadVariantId(id,'GRCh37')).toBeNull();
 });
 it('uses the official GraphQL variable name, never interpolated executable text',()=>{
  const body=gnomadPopulationQueryBody(id,'GRCh38');
  expect(body?.variables.variantId).toBe(id);
  expect(body?.query).toContain('variant(variantId:$variantId,dataset:gnomad_r4)');
  expect(body?.query).not.toContain(id);
  expect(GNOMAD_POPULATION_QUERY).toContain('reference_genome');
  expect(gnomadPopulationQueryBody('c.1521_1523delCTT','GRCh38')).toBeNull();
 });
 it('preserves separate genome and exome callsets, raw allele counts and zero-frequency observations',()=>{
  const result=decodeGnomadPopulationResponse(ok(source),id);
  expect(result.state).toBe('available');
  if(result.state!=='available')throw Error('expected valid reference');
  expect(result.record).toMatchObject({dataset:'gnomad_r4',assembly:'GRCh38',variantId:id});
  expect(result.record.genome).toMatchObject({alleleCount:2,alleleNumber:1000,alleleFrequency:0.002});
  expect(result.record.exome).toMatchObject({alleleCount:4,alleleNumber:2000,alleleFrequency:0.002});
  expect(result.record.genome?.populations).toEqual([
   {id:'nfe',alleleCount:1,alleleNumber:250,alleleFrequency:0.004},
   {id:'afr',alleleCount:0,alleleNumber:200,alleleFrequency:0}
  ]);
  // A population with denominator 0 is missing evidence, never shown as AF=0.
  expect(result.record.genome?.populations.find(p=>p.id==='fin')).toBeUndefined();
  const printed=JSON.stringify(result);
  expect(printed).not.toMatch(/BA1|PM2|country|prevalence|region|therapy|patient/i);
 });
 it('distinguishes not found and no coverage without manufacturing frequency',()=>{
  expect(decodeGnomadPopulationResponse(ok(null),id)).toEqual({state:'not-found'});
  expect(decodeGnomadPopulationResponse(ok({...source,genome:null,exome:{ac:0,an:0,af:null}}),id))
   .toEqual({state:'no-coverage'});
 });
 it('fails closed on identity, assembly, GraphQL, denominator or frequency mismatches',()=>{
  for(const variant of [
   {...source,variant_id:'7-117559591-A-G'},
   {...source,reference_genome:'GRCh37'},
   {...source,genome:{ac:10,an:5,af:0.5}},
   {...source,genome:{ac:2,an:1000,af:0.9}},
   {...source,genome:{ac:2,an:1000,populations:[{id:'nfe',ac:4,an:3}]}},
   {...source,genome:{ac:2,an:1000,populations:[{id:'nfe',ac:1,an:300},{id:'nfe',ac:1,an:300}]}},
   {...source,genome:{ac:2,an:1000,populations:[{id:'bad script',ac:1,an:300}]}}
  ])expect(()=>decodeGnomadPopulationResponse(ok(variant),id)).toThrow();
  expect(()=>decodeGnomadPopulationResponse({errors:[{message:'api error'}]},id)).toThrow();
  expect(()=>decodeGnomadPopulationResponse({},id)).toThrow();
  expect(()=>decodeGnomadPopulationResponse(ok(source),'not-a-genomic-id')).toThrow();
 });
 it('is opt-in, transport-restricted and returns only source-derived read-only data',async()=>{
  const transport=vi.fn(async(url:string,options?:RequestInit)=>{
   expect(url).toBe(GNOMAD_ENDPOINT);
   expect(options?.method).toBe('POST');
   expect(options?.credentials).toBe('omit');
   expect(options?.redirect).toBe('error');
   expect(options?.cache).toBe('no-store');
   expect(JSON.parse(String(options?.body))).toMatchObject({
    variables:{variantId:id}
   });
   return response(ok(source));
  });
  expect(await fetchGnomadPopulationReference(id,'GRCh38',transport as unknown as typeof fetch))
   .toMatchObject({state:'available'});
  expect(transport).toHaveBeenCalledTimes(1);
  expect(await fetchGnomadPopulationReference('rs123','GRCh38',transport as unknown as typeof fetch))
   .toEqual({state:'unavailable',reason:'invalid-response'});
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it('preserves network failure, upstream HTTP and malformed response as unavailable',async()=>{
  const failure=vi.fn(async()=>{throw Error('offline');});
  expect(await fetchGnomadPopulationReference(id,'GRCh38',failure as unknown as typeof fetch))
   .toEqual({state:'unavailable',reason:'network'});
  const server=vi.fn(async()=>response({error:'rate limited'},429));
  expect(await fetchGnomadPopulationReference(id,'GRCh38',server as unknown as typeof fetch))
   .toEqual({state:'unavailable',reason:'http-error'});
  const wrong=vi.fn(async()=>response(ok({...source,reference_genome:'GRCh37'})));
  expect(await fetchGnomadPopulationReference(id,'GRCh38',wrong as unknown as typeof fetch))
   .toEqual({state:'unavailable',reason:'invalid-response'});
 });
 it('respects cancellation instead of reporting an aborted request as genuine source failure',async()=>{
  const controller=new AbortController();controller.abort();
  const request=vi.fn(async()=>{throw new DOMException('aborted','AbortError');});
  await expect(fetchGnomadPopulationReference(id,'GRCh38',request as unknown as typeof fetch,controller.signal))
   .rejects.toMatchObject({name:'AbortError'});
 });
});
