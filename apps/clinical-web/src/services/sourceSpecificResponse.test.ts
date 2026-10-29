import {describe,it,expect,vi} from 'vitest';
import {
 createSourceSpecificResponseSource,decodeResponseRow,decodeResponseSource,responseLabel
} from './sourceSpecificResponse';
const config={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_ci',enabled:true,accessMode:'anonymous' as const};
const row={id:14,variant_id:14,source_id:2,eti_response:'non_responsive',alyftrek_response:null,
 confidence:'recorded',sample_size:null,created_at:'2026-10-14T00:00:00+00:00'};
const source={id:2,source_key:'Burgel_2025',display_name:'Recorded paper',source_type:'research_paper',
 year:2025,url:null,is_active:true};
const reply=(value:unknown,status=200)=>new Response(JSON.stringify(value),{status});
const transport=(rows:unknown=[row],sources:unknown=[source])=>vi.fn(async(url:string,_init:RequestInit)=>{
 const u=new URL(url);
 return reply(u.pathname.endsWith('/variant_evidence')?rows:sources);
});
describe('14H3 source-specific original evidence fields',()=>{
 it('preserves literal source finding, ETI/Alyftrek separation and missing source URLs',async()=>{
  const t=transport();
  const records=await createSourceSpecificResponseSource(config,t as typeof fetch).get('14');
  expect(records).toHaveLength(1);
  expect(records[0].eti).toBe('non_responsive');
  expect(records[0].alyftrek).toBeNull();
  expect(records[0].source.key).toBe('Burgel_2025');
  expect(records[0].source.url).toBeNull();
  expect(responseLabel(records[0].eti)).toContain('source label');
  expect(Object.isFrozen(records[0])).toBe(true);
  expect(t).toHaveBeenCalledTimes(2);
  const u=new URL(t.mock.calls[0][0]);
  expect(u.searchParams.get('variant_id')).toBe('eq.14');
  expect(u.searchParams.get('select')).not.toMatch(/notes|clinician|actor/);
  expect(t.mock.calls.every((x)=>x[1].method==='GET'&&x[1].credentials==='omit')).toBe(true);
 });
 it('requires exact variant ID, prevents unrelated records from being presented',async()=>{
  const t=transport([{...row,variant_id:15}]);
  await expect(createSourceSpecificResponseSource(config,t as typeof fetch).get('14'))
   .rejects.toMatchObject({code:'schema-mismatch'});
  const invalid=transport();
  for(const id of ['0','014','14;delete','14,15','-1'])
   expect(await createSourceSpecificResponseSource(config,invalid as typeof fetch).get(id)).toEqual([]);
  expect(invalid).not.toHaveBeenCalled();
 });
 it('rejects missing, extraneous or duplicate source metadata instead of orphaned scientific claims',async()=>{
  for(const sources of [[],[{...source,id:3}],[source,source]]){
   await expect(createSourceSpecificResponseSource(config,transport([row],sources) as typeof fetch).get('14'))
    .rejects.toMatchObject({code:'schema-mismatch'});
  }
 });
 it('does not treat empty result as nonresponse and never asks for unneeded sources',async()=>{
  const t=transport([]);
  expect(await createSourceSpecificResponseSource(config,t as typeof fetch).get('14')).toEqual([]);
  expect(t).toHaveBeenCalledTimes(1);
 });
 it('rejects unknown scientific labels, invalid counts and unsafe remote source URLs',()=>{
  expect(()=>decodeResponseRow({...row,eti_response:'approved'})).toThrow();
  expect(()=>decodeResponseRow({...row,sample_size:-2})).toThrow();
  expect(()=>decodeResponseRow({...row,source_id:0})).toThrow();
  expect(()=>decodeResponseSource({...source,url:'javascript:alert(1)'})).toThrow();
  expect(()=>decodeResponseSource({...source,url:'https://doi.org.evil.example/study'})).toThrow();
  expect(()=>decodeResponseSource({...source,year:2025.5})).toThrow();
  expect(decodeResponseRow({...row,eti_response:null}).eti).toBeNull();
 });
 it('rejects complete-looking truncated, duplicated or misplaced response rows',async()=>{
  const overflow=Array.from({length:31},(_,i)=>({...row,id:i+1}));
  await expect(createSourceSpecificResponseSource(config,transport(overflow) as typeof fetch).get('14'))
   .rejects.toMatchObject({code:'schema-mismatch'});
  await expect(createSourceSpecificResponseSource(config,transport([row,row]) as typeof fetch).get('14'))
   .rejects.toMatchObject({code:'schema-mismatch'});
 });
 it('distinguishes denied, unavailable and malformed pages',async()=>{
  for(const [status,code] of [[403,'access-denied'],[503,'request-failed']] as const){
   const t=vi.fn(async()=>reply({},status));
   await expect(createSourceSpecificResponseSource(config,t as typeof fetch).get('14'))
    .rejects.toMatchObject({code});
  }
  await expect(createSourceSpecificResponseSource(config,transport({items:[row]}) as typeof fetch).get('14'))
   .rejects.toMatchObject({code:'schema-mismatch'});
 });
 it('authenticated mode requires a real bearer and uses it for both GET requests',async()=>{
  const cfg={...config,accessMode:'authenticated' as const};
  const t=transport();
  await expect(createSourceSpecificResponseSource(cfg,t as typeof fetch).get('14'))
   .rejects.toMatchObject({code:'authentication-required'});
  const p={getAccessToken:async()=> 'eyJhbGciOiJIUzI1NiJ9.e30.signature'};
  await createSourceSpecificResponseSource(cfg,t as typeof fetch,p).get('14');
  expect(t.mock.calls.every(x=>(x[1].headers as Record<string,string>).Authorization?.startsWith('Bearer eyJ'))).toBe(true);
 });
});
