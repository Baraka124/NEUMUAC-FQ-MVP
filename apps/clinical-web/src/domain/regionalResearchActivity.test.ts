import {describe,it,expect,vi} from 'vitest';
import {decodeRegionalResearchActivity,getRegionalResearchActivity} from './regionalResearchActivity';
import type {ReadOnlyConfig,ReadSessionProvider} from '../services/liveVariants';

const sample={
 region_code:'12',search_events:674,distinct_sessions:83,
 first_observed_at:'2026-04-06T12:03:54.803Z',
 last_observed_at:'2026-05-23T12:03:47.181Z'
};
const config:ReadOnlyConfig={
 endpoint:'https://test-geo.supabase.co',
 publishableKey:'sb_publishable_test_example',
 enabled:true,accessMode:'authenticated'
};
const session:ReadSessionProvider={getAccessToken:async()=> 'signed-researcher-test-token'};
const data=(value:unknown,status=200)=>new Response(JSON.stringify(value),{
 status,headers:{'Content-Type':'application/json'}
});

describe('14H162: privacy-thresholded research-search activity',()=>{
 it('only accepts mapped Spanish region codes and statistically safe observations',()=>{
  expect(decodeRegionalResearchActivity([sample])).toEqual([{
   regionCode:'12',searchEvents:674,distinctSessions:83,
   firstObservedAt:sample.first_observed_at,
   lastObservedAt:sample.last_observed_at
  }]);
  expect(decodeRegionalResearchActivity([])).toEqual([]);
 });
 it('fails closed on unknown codes, small cells, duplicate rows, invalid dates or numbers',()=>{
  const invalid=[
   [{...sample,region_code:'25'}],
   [{...sample,region_code:'Galicia'}],
   [{...sample,search_events:19}],
   [{...sample,distinct_sessions:9}],
   [{...sample,distinct_sessions:999}],
   [{...sample,search_events:-1}],
   [{...sample,search_events:'674'}],
   [{...sample,first_observed_at:'not a date'}],
   [{...sample,last_observed_at:'2026-01-01T00:00:00Z'}],
   [sample,sample],
   null,
   [null]
  ];
  for(const raw of invalid)expect(()=>decodeRegionalResearchActivity(raw)).toThrow();
 });
 it('only invokes the fixed researcher RPC with bearer JWT and optional variant ID',async()=>{
  const transport=vi.fn(async(url:string,init?:RequestInit)=>{
   expect(url).toBe('https://test-geo.supabase.co/rest/v1/rpc/nfq_geographic_research_activity');
   expect(init?.method).toBe('POST');
   expect(init?.credentials).toBe('omit');
   expect(init?.cache).toBe('no-store');
   expect(init?.redirect).toBe('error');
   expect((init?.headers as Record<string,string>).Authorization).toBe('Bearer signed-researcher-test-token');
   expect(JSON.parse(String(init?.body))).toEqual({p_variant_id:'18'});
   return data([sample]);
  });
  const result=await getRegionalResearchActivity(config,session,'18',transport as unknown as typeof fetch);
  expect(result.status).toBe('available');
  if(result.status==='available')expect(result.rows[0].searchEvents).toBe(674);
  expect(transport).toHaveBeenCalledTimes(1);
 });
 it('never requests raw logs; rejects invalid IDs and missing sessions before fetch',async()=>{
  const transport=vi.fn(async()=>data([sample]));
  const noAuth:ReadSessionProvider={getAccessToken:async()=>null};
  expect(await getRegionalResearchActivity(config,noAuth,null,transport as unknown as typeof fetch))
   .toEqual({status:'restricted',rows:[]});
  expect(await getRegionalResearchActivity(config,session,'01',transport as unknown as typeof fetch))
   .toEqual({status:'unavailable',rows:[]});
  expect(transport).not.toHaveBeenCalled();
 });
 it('preserves restricted, empty, unavailable and corrupted response as separate states',async()=>{
  const denial=vi.fn(async()=>data({message:'forbidden'},403));
  expect(await getRegionalResearchActivity(config,session,null,denial as unknown as typeof fetch))
   .toEqual({status:'restricted',rows:[]});
  const empty=vi.fn(async()=>data([]));
  expect(await getRegionalResearchActivity(config,session,null,empty as unknown as typeof fetch))
   .toEqual({status:'empty',rows:[]});
  const server=vi.fn(async()=>data({message:'rpc unavailable'},404));
  expect(await getRegionalResearchActivity(config,session,null,server as unknown as typeof fetch))
   .toEqual({status:'unavailable',rows:[]});
  const corrupt=vi.fn(async()=>data([{...sample,distinct_sessions:1}]));
  expect(await getRegionalResearchActivity(config,session,null,corrupt as unknown as typeof fetch))
   .toEqual({status:'unavailable',rows:[]});
 });
 it('passes cancellation to the transport without reinterpreting it as absence of research activity',async()=>{
  const controller=new AbortController();controller.abort();
  const aborted=vi.fn(async()=>{throw new DOMException('aborted','AbortError');});
  await expect(getRegionalResearchActivity(config,session,null,aborted as unknown as typeof fetch,controller.signal))
   .rejects.toMatchObject({name:'AbortError'});
 });
});
