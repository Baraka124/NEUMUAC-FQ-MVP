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
