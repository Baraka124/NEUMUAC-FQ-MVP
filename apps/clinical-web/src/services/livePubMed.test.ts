import {describe,it,expect,vi} from 'vitest';
import {supportedPubMedId,decodePubMedMetadata,retrievePubMedMetadata} from './livePubMed';
const payload=(id='12345')=>({result:{uids:[id],[id]:{uid:id,title:'Recorded source publication',
 pubtype:['Journal Article','Randomized Controlled Trial']}}});
describe('on-demand PubMed publication-type metadata',()=>{
 it('fetches only the explicitly recorded PMID from the official summary endpoint',async()=>{
  const fetcher=vi.fn(async()=>new Response(JSON.stringify(payload()),{status:200}));
  const summary=await retrievePubMedMetadata('12345',fetcher as typeof fetch);
  expect(summary.publicationTypes).toEqual(['Journal Article','Randomized Controlled Trial']);
  expect(summary.pmid).toBe('12345');
  expect(summary.sourceUrl).toBe('https://pubmed.ncbi.nlm.nih.gov/12345/');
  const [address,settings]=fetcher.mock.calls[0] as unknown as [string,RequestInit];
  expect(new URL(address).host).toBe('eutils.ncbi.nlm.nih.gov');
  expect(new URL(address).searchParams.get('db')).toBe('pubmed');
  expect(new URL(address).searchParams.get('id')).toBe('12345');
  expect(settings.method).toBe('GET');expect(settings.body).toBeUndefined();
  expect(settings.credentials).toBe('omit');expect(settings.cache).toBe('no-store');
 });
 it('does not look up malformed PMIDs or unconstrained search terms',async()=>{
  const fetcher=vi.fn();
  for(const id of ['','0','12 OR CFTR','abc','12,34','000123','1'.repeat(30)]){
   expect(supportedPubMedId(id)).toBe(false);
   await expect(retrievePubMedMetadata(id,fetcher as typeof fetch)).rejects.toThrow();
  }
  expect(fetcher).not.toHaveBeenCalled();
 });
 it('rejects unrelated, multiple or noncompliant authority documents',()=>{
  expect(()=>decodePubMedMetadata(payload('12346'),'12345','2026-10-19T00:00:00Z')).toThrow();
  expect(()=>decodePubMedMetadata({result:{uids:['12345','12346']}},'12345','2026-10-19T00:00:00Z')).toThrow();
  expect(()=>decodePubMedMetadata({result:{uids:['12345'],12345:{uid:'12346'}}},'12345','2026-10-19T00:00:00Z')).toThrow();
  expect(()=>decodePubMedMetadata({result:{uids:['12345'],12345:{uid:'12345',pubtype:[4]}}},'12345','2026-10-19T00:00:00Z')).toThrow();
 });
 it('preserves absent publication types as absent, never as an inferred study design',()=>{
  const summary=decodePubMedMetadata({result:{uids:['12345'],12345:{uid:'12345'}}},'12345','2026-10-19T00:00:00Z');
  expect(summary.title).toBeNull();expect(summary.publicationTypes).toEqual([]);
 });
 it('fails on outage, instead of preserving stale or fabricated metadata',async()=>{
  const fetcher=vi.fn(async()=>new Response('{}',{status:503}));
  await expect(retrievePubMedMetadata('12345',fetcher as typeof fetch)).rejects.toThrow('unavailable');
 });
});
