import {it,expect,vi} from 'vitest';
import {createLiveEvidenceSource} from './liveEvidence';
const config={endpoint:'https://research.supabase.co',publishableKey:'sb_publishable_test123',enabled:true,readTable:'variants' as const};
const link=(i:number,variant=12)=>({id:i,variant_id:variant,title:'Reference '+i,url:'https://doi.org/10.1000/test',source:'Recorded source'});
it('does not pass off capped variant references as complete',async()=>{
 const transport=vi.fn(async(_url:string)=>new Response(JSON.stringify(Array.from({length:201},(_,i)=>link(i+1))),{status:200}));
 const repo=createLiveEvidenceSource(config,transport as typeof fetch);
 await expect(repo.forVariant('12')).rejects.toMatchObject({code:'request-failed'});
 expect(new URL(transport.mock.calls[0]?.[0]||'').searchParams.get('limit')).toBe('201');
});
it('rejects references attributed to a different variant',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify([link(1,13)]),{status:200}));
 await expect(createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
});

it('rejects malformed evidence IDs and linked record identifiers before displaying sources',async()=>{
 const invalid=[0,-1,1.5,Number.MAX_SAFE_INTEGER+1,'0','-1','1e3',' 12 ','12;DELETE',null];
 for(const id of invalid){
  const t=vi.fn(async()=>new Response(JSON.stringify([{...link(1),variant_id:id}]),{status:200}));
  await expect(createLiveEvidenceSource(config,t as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
 }
 for(const id of [0,-1,1.5,Number.MAX_SAFE_INTEGER+1]){
  const t=vi.fn(async()=>new Response(JSON.stringify([link(id)]),{status:200}));
  await expect(createLiveEvidenceSource(config,t as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
 }
});
it('does not query for invalid selected variant identifiers',async()=>{
 const net=vi.fn();
 const source=createLiveEvidenceSource(config,net as typeof fetch);
 for(const id of ['0','012','-12','12;DELETE','1e3']){
  expect(await source.forVariant(id)).toEqual([]);
 }
 expect(net).not.toHaveBeenCalled();
});
it('accepts a correctly scoped recorded evidence identifier and reference',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify([link(1)]),{status:200}));
 const result=await createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12');
 expect(result).toHaveLength(1);
 expect(result[0].variantId).toBe('12');
});

it('allows the established HTTPS source link while refusing disguised authority origins',async()=>{
 const accepted=vi.fn(async()=>new Response(JSON.stringify([link(1)]),{status:200}));
 expect(await createLiveEvidenceSource(config,accepted as typeof fetch).forVariant('12')).toHaveLength(1);
 for(const url of [
  'https://doi.org:8443/10.1000/test',
  'https://attacker.example@doi.org:8443/10.1000/test',
  'https://doi.org.evil.example/10.1000/test',
  'http://doi.org/10.1000/test'
 ]){
  const transport=vi.fn(async()=>new Response(JSON.stringify([{...link(1),url}]),{status:200}));
  await expect(createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
 }
});

it('preserves recorded CFTR2 links from either canonical hostname without granting arbitrary domains',async()=>{
 for(const hostname of ['cftr2.org','www.cftr2.org']){
  const url='https://'+hostname+'/mutation/scientific/example';
  const transport=vi.fn(async()=>new Response(JSON.stringify([{...link(3),url}]),{status:200}));
  const refs=await createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12');
  expect(refs[0].url).toBe(url);
 }
 for(const url of ['https://cftr2.org.evil.example/variant/x','https://www.cftr2.org:8443/variant/x']){
  const transport=vi.fn(async()=>new Response(JSON.stringify([{...link(3),url}]),{status:200}));
  await expect(createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
 }
});

it('rejects duplicate research-reference IDs rather than displaying two independent citations',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify([link(3),link(3)]),{status:200}));
 const source=createLiveEvidenceSource(config,transport as typeof fetch);
 await expect(source.forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
 await expect(source.list({query:'',page:0})).rejects.toMatchObject({code:'schema-mismatch'});
});
it('rejects an oversized evidence page rather than silently truncating a malformed service response',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify(Array.from({length:32},(_,i)=>link(i+1))),{status:200}));
 await expect(createLiveEvidenceSource(config,transport as typeof fetch).list({query:'',page:0})).rejects.toMatchObject({code:'schema-mismatch'});
});
it('preserves legitimate evidence paging and the extra-record has-more flag',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify(Array.from({length:31},(_,i)=>link(i+1))),{status:200}));
 const page=await createLiveEvidenceSource(config,transport as typeof fetch).list({query:'',page:0});
 expect(page.records).toHaveLength(30);
 expect(page.hasMore).toBe(true);
});
