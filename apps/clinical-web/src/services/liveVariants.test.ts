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

it('uses exact-name matching and stable server-side validation priorities',async()=>{
 const urls:string[]=[];const net=vi.fn(async(url:string)=>{urls.push(url);return new Response('[]',{status:200})});
 const src=createReadOnlyRepository({...config,readTable:'variants'},net as typeof fetch);
 await src.list({query:'R117H',page:0,searchMode:'exact-name',sort:'fewest-validations'});
 await src.list({query:'G551D',page:1,sort:'most-validations'});
 const a=new URL(urls[0]),b=new URL(urls[1]);
 expect(a.searchParams.get('order')).toBe('validation_count.asc.nullslast,id.asc');
 expect(a.searchParams.get('or')).toContain('legacy_name.ilike.R117H');
 expect(a.searchParams.get('or')).not.toContain('alt_names');
 expect(b.searchParams.get('order')).toBe('validation_count.desc.nullslast,id.asc');
 expect(b.searchParams.get('offset')).toBe('40');
});

it('resolves an exact identity independently of alphabetic list pagination',async()=>{
 const calls:string[]=[];
 const transport=vi.fn(async(url:string)=>{calls.push(url);return new Response(JSON.stringify([{id:18,legacy_name:'F508del',protein_name:'p.Phe508del',cdna_name:'c.1521_1523delCTT',alt_names:'DF508',cftr_class:'II',validation_count:2}]),{status:200})});
 const source=createReadOnlyRepository({...config,readTable:'variants'},transport as typeof fetch);
 const result=await source.resolveExact('DF508','all');
 expect(result?.id).toBe('18');
 const params=new URL(calls[0]).searchParams;
 expect(params.get('offset')).toBeNull();
 expect(params.get('or')).toContain('alt_names.ilike.*DF508*');
 expect(params.get('limit')).toBe('41');
});
it('does not automatically resolve conflicting or incomplete exact identities',async()=>{
 const duplicate=[{id:18,legacy_name:'R117H',protein_name:null,cdna_name:null,alt_names:null},{id:21,legacy_name:'R117H',protein_name:null,cdna_name:null,alt_names:null}];
 const network=vi.fn(async()=>new Response(JSON.stringify(duplicate),{status:200}));
 const source=createReadOnlyRepository({...config,readTable:'variants'},network as typeof fetch);
 expect(await source.resolveExact('R117H')).toBeNull();
 const cap=vi.fn(async()=>new Response(JSON.stringify(Array.from({length:41},(_,i)=>({id:i+1,legacy_name:i===0?'R117H':'OTHER'+i,protein_name:null,cdna_name:null,alt_names:null}))),{status:200}));
 expect(await createReadOnlyRepository({...config,readTable:'variants'},cap as typeof fetch).resolveExact('R117H')).toBeNull();
});

it('queries multiple live variant terms in one safe OR search with database pagination',async()=>{
 const calls:string[]=[];
 const transport=vi.fn(async(url:string)=>{calls.push(url);return new Response('[]',{status:200})});
 const source=createReadOnlyRepository({...config,readTable:'variants'},transport as typeof fetch);
 await source.list({query:'F508del, G551D',page:1});
 const q=new URL(calls[0]).searchParams;
 expect(q.get('or')).toContain('legacy_name.ilike.*F508del*');
 expect(q.get('or')).toContain('protein_name.ilike.*G551D*');
 expect(q.get('offset')).toBe('40');
 expect(await source.resolveExact('F508del,G551D')).toBeNull();
 expect(calls).toHaveLength(1);
});

it('blocks unsupported scientific notation before the live query',async()=>{
 const network=vi.fn();
 const repo=createReadOnlyRepository({...config,readTable:'variants'},network as typeof fetch);
 for(const query of ['p.(Phe508del)','p.[Phe508del;Gly551Asp]','c.?']){
  await expect(repo.list({query,page:0})).rejects.toMatchObject({code:'request-failed'});
 }
 expect(network).not.toHaveBeenCalled();
});
