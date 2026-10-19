import {describe,it,expect,vi} from 'vitest';
import {createHeliosQueueSource,decodeHeliosQueuePage,HeliosQueueError} from './heliosQueue';
const cfg={enabled:true,endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_test_only'};
const session={getAccessToken:vi.fn(async()=> 'real-user-jwt')};
const item={decisionId:'NFQ-NOM-101',kind:'alias-equivalence',phase:'under-review',revision:1,version:2,createdAt:'2026-10-19T00:00:00Z'};
describe('Helios server-verified read-only queue',()=>{
 it('uses only the configured official function, bearer token and no-store GET',async()=>{
  const sent=vi.fn(async()=>new Response(JSON.stringify({items:[item],offset:0,hasMore:false})));
  const source=createHeliosQueueSource(cfg,session,sent as typeof fetch);
  expect((await source.list()).items).toHaveLength(1);
  const [url,options]=sent.mock.calls[0] as unknown as [string,RequestInit];
  expect(url).toBe('https://example.supabase.co/functions/v1/nfq-review-queue?offset=0');
  expect(options.method).toBe('GET');expect(options.body).toBeUndefined();
  expect(options.cache).toBe('no-store');expect(options.credentials).toBe('omit');
  expect((options.headers as Record<string,string>).Authorization).toBe('Bearer real-user-jwt');
 });
 it('fails closed for session unavailable and server denying access, without unauthorized reads',async()=>{
  const sent=vi.fn();
  const source=createHeliosQueueSource(cfg,{getAccessToken:async()=>null},sent as typeof fetch);
  await expect(source.list()).rejects.toMatchObject({kind:'sign-in-required'});
  expect(sent).not.toHaveBeenCalled();
  const deny=createHeliosQueueSource(cfg,session,async()=>new Response('{}',{status:403}));
  await expect(deny.list()).rejects.toMatchObject({kind:'access-denied'});
 });
 it('rejects malformed identity, duplicated records, unexpected phase and pagination',()=>{
  expect(decodeHeliosQueuePage({items:[{...item,privateReviewer:'private'}],offset:0,hasMore:false},0))
   .toEqual({items:[item],offset:0,hasMore:false});
  for(const entry of [{...item,decisionId:'42'}, {...item,phase:'draft'}, {...item,createdAt:'today'}]){
   expect(()=>decodeHeliosQueuePage({items:[entry],offset:0,hasMore:false},0)).toThrow(HeliosQueueError);
  }
  expect(()=>decodeHeliosQueuePage({items:[item,item],offset:0,hasMore:false},0)).toThrow();
  expect(()=>decodeHeliosQueuePage({items:[item],offset:20,hasMore:false},0)).toThrow();
  expect(()=>decodeHeliosQueuePage({items:[item],offset:0,hasMore:true},0)).toThrow();
 });
 it('does not query invalid pages and does not infer missing review records',async()=>{
  const sent=vi.fn();
  const source=createHeliosQueueSource(cfg,session,sent as typeof fetch);
  await expect(source.list(12)).rejects.toMatchObject({kind:'unavailable'});
  expect(sent).not.toHaveBeenCalled();
  const fail=createHeliosQueueSource(cfg,session,async()=>new Response('{}',{status:503}));
  await expect(fail.list()).rejects.toMatchObject({kind:'unavailable'});
 });
});
