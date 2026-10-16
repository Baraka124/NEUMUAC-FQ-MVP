import {it,expect,vi} from 'vitest';
import {createLiveEvidenceSource} from './liveEvidence';
const config={endpoint:'https://research.supabase.co',publishableKey:'sb_publishable_test123',enabled:true,readTable:'variants' as const};
const link=(i:number,variant=12)=>({id:i,variant_id:variant,title:'Reference '+i,url:'https://doi.org/10.1000/test',source:'Recorded source'});
it('does not pass off capped variant references as complete',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify(Array.from({length:201},(_,i)=>link(i+1))),{status:200}));
 const repo=createLiveEvidenceSource(config,transport as typeof fetch);
 await expect(repo.forVariant('12')).rejects.toMatchObject({code:'request-failed'});
 expect(new URL(transport.mock.calls[0]?.[0]||'').searchParams.get('limit')).toBe('201');
});
it('rejects references attributed to a different variant',async()=>{
 const transport=vi.fn(async()=>new Response(JSON.stringify([link(1,13)]),{status:200}));
 await expect(createLiveEvidenceSource(config,transport as typeof fetch).forVariant('12')).rejects.toMatchObject({code:'schema-mismatch'});
});
