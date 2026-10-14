import {describe,it,expect,vi} from 'vitest';
import {createReadOnlyRepository,decodeRealVariant,variantDisplayName,VariantConnectionError} from './liveVariants';
const config={endpoint:'https://db.example.org',publishableKey:'sb_publishable_test_only_123',enabled:true,accessMode:'anonymous' as const};
describe('real-record read-only adapter contract',()=>{
it('never manufactures missing variant names, evidence or classification',()=>{const row=decodeRealVariant({id:123,legacy_name:null,protein_name:'p.Arg117His',alt_names:['R117H']});expect(variantDisplayName(row)).toBe('p.Arg117His');expect(row.aliases).toEqual(['R117H']);});
it('rejects malformed and privileged configuration',()=>{expect(()=>createReadOnlyRepository({...config,endpoint:'http://db.example.org'})).toThrow(VariantConnectionError);expect(()=>createReadOnlyRepository({...config,publishableKey:'service_role'})).toThrow();});
it('performs GET only, with explicit fields and no credentialed browser storage',async()=>{const fetchMock=vi.fn(async()=>new Response(JSON.stringify([{id:'1',legacy_name:'R117H',protein_name:null,cdna_name:'c.350G>A',alt_names:null}]),{status:200}));const repo=createReadOnlyRepository(config,fetchMock as typeof fetch);const result=await repo.list({page:0,query:'R117H'});expect(result.records[0].legacyName).toBe('R117H');const [url,init]=fetchMock.mock.calls[0] as unknown as [string,RequestInit];expect(url).toContain('/rest/v1/nfq_public_variant_catalog');expect(url).toContain('select=');expect(init.method).toBe('GET');expect(init.credentials).toBe('omit');expect('save' in repo).toBe(false);});
it('distinguishes zero records from denied reads',async()=>{const empty=createReadOnlyRepository(config,vi.fn(async()=>new Response('[]',{status:200})) as typeof fetch);expect((await empty.list({page:0,query:''})).records).toEqual([]);const denied=createReadOnlyRepository(config,vi.fn(async()=>new Response('{}',{status:403})) as typeof fetch);await expect(denied.list({page:0,query:''})).rejects.toMatchObject({code:'access-denied'});});
});

it('requires a session JWT for authenticated reads; never falls back to anonymous',async()=>{
 const network=vi.fn(async()=>new Response('[]',{status:200}));
 const secured=createReadOnlyRepository({...config,accessMode:'authenticated'},network as typeof fetch);
 await expect(secured.list({page:0,query:''})).rejects.toMatchObject({code:'authentication-required'});
 expect(network).not.toHaveBeenCalled();
 const session=createReadOnlyRepository({...config,accessMode:'authenticated'},network as typeof fetch,{getAccessToken:async()=>null});
 await expect(session.list({page:0,query:''})).rejects.toMatchObject({code:'authentication-required'});
 expect(network).not.toHaveBeenCalled();
});
it('uses publishable key only as apikey and user JWT only as bearer',async()=>{
 const jwt='eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.signature';
 const calls:RequestInit[]=[];
 const fetchMock=vi.fn(async(_url:unknown,opts:RequestInit)=>{calls.push(opts);return new Response('[]',{status:200})});
 const authenticated=createReadOnlyRepository({...config,accessMode:'authenticated'},fetchMock as typeof fetch,{getAccessToken:async()=>jwt});
 await authenticated.list({page:0,query:''});
 const headers=calls[0].headers as Record<string,string>;
 expect(headers.apikey).toBe(config.publishableKey);
 expect(headers.Authorization).toBe('Bearer '+jwt);
 const anon=createReadOnlyRepository(config,fetchMock as typeof fetch);
 await anon.list({page:0,query:''});
 expect((calls[1].headers as Record<string,string>).Authorization).toBeUndefined();
});
it('distinguishes schema mismatch and blocks injection-shaped search',async()=>{
 const bad=createReadOnlyRepository(config,vi.fn(async()=>new Response(JSON.stringify({code:'42703'}),{status:400})) as typeof fetch);
 await expect(bad.list({query:'',page:0})).rejects.toMatchObject({code:'schema-mismatch'});
 const network=vi.fn();
 const safe=createReadOnlyRepository(config,network as typeof fetch);
 await expect(safe.list({query:'x),id.eq.1',page:0})).rejects.toMatchObject({code:'request-failed'});
 expect(network).not.toHaveBeenCalled();
});

it('reads legacy public variants table using GET-only allowlisted columns in development',async()=>{
 const calls:{url:string,init:RequestInit}[]=[];
 const transport=vi.fn(async(url:string,init:RequestInit)=>{calls.push({url,init});return new Response(JSON.stringify([{id:101,legacy_name:'R117H',protein_name:'p.Arg117His',cdna_name:'c.350G>A',alt_names:null}]),{status:200})});
 const source=createReadOnlyRepository({...config,readTable:'variants'},transport as typeof fetch);
 const result=await source.list({query:'R117H',page:0});
 expect(result.records[0].legacyName).toBe('R117H');
 expect(calls[0].url).toContain('/rest/v1/variants?');
 expect(calls[0].url).toContain('select=id%2Clegacy_name%2Cprotein_name%2Ccdna_name%2Calt_names');
 expect(calls[0].init.method).toBe('GET');
 expect(calls[0].init.credentials).toBe('omit');
});

it('applies actual class I and unclassified filters at the database before paging',async()=>{
 const urls:string[]=[];
 const transport=vi.fn(async(url:string)=>{urls.push(url);return new Response('[]',{status:200})});
 const src=createReadOnlyRepository({...config,readTable:'variants'},transport as typeof fetch);
 await src.list({query:'',page:0,classFilter:'I',sort:'recent-record'});
 await src.list({query:'',page:1,classFilter:'unclassified',sort:'name-desc'});
 const a=new URL(urls[0]),b=new URL(urls[1]);
 expect(a.searchParams.get('cftr_class')).toBe('eq.I');
 expect(a.searchParams.get('order')).toBe('id.desc');
 expect(b.searchParams.get('cftr_class')).toBe('is.null');
 expect(b.searchParams.get('offset')).toBe('40');
 expect(b.searchParams.get('order')).toBe('legacy_name.desc,id.asc');
});
