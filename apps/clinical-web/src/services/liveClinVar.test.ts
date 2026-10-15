import {describe,it,expect,vi} from 'vitest';
import {decodeClinVarSummary,retrieveClinVarSummary} from './liveClinVar';

const result=(id='7105',gene='CFTR')=>({result:{uids:[id],[id]:{
  uid:id,accession:'VCV000007105',title:'Recorded authority nomenclature',
  genes:[{symbol:gene}],germline_classification:{
    description:'Classification as recorded by external source',
    review_status:'External review status',last_evaluated:'2025/06/15 00:00'
  }
}}});
describe('on-demand ClinVar ESummary authority contract',()=>{
 it('retrieves only the recorded variation identifier with safe GET settings',async()=>{
  const network=vi.fn(async()=>new Response(JSON.stringify(result()),{status:200}));
  const summary=await retrieveClinVarSummary('VCV000007105',network as typeof fetch);
  expect(summary.variationId).toBe('7105');
  expect(summary.sourceUrl).toBe('https://www.ncbi.nlm.nih.gov/clinvar/variation/VCV000007105/');
  expect(summary.reviewStatus).toBe('External review status');
  const [address,init]=network.mock.calls[0] as unknown as [string,RequestInit];
  const url=new URL(address);
  expect(url.origin).toBe('https://eutils.ncbi.nlm.nih.gov');
  expect(url.searchParams.get('db')).toBe('clinvar');
  expect(url.searchParams.get('id')).toBe('7105');
  expect(url.searchParams.get('retmode')).toBe('json');
  expect(init.method).toBe('GET');
  expect(init.credentials).toBe('omit');
  expect(init.cache).toBe('no-store');
  expect(init.body).toBeUndefined();
 });
 it('refuses invalid IDs before reaching an external service',async()=>{
  const network=vi.fn();
  await expect(retrieveClinVarSummary('RCV000007105',network as typeof fetch)).rejects.toThrow();
  await expect(retrieveClinVarSummary('7105) OR patient',network as typeof fetch)).rejects.toThrow();
  await expect(retrieveClinVarSummary(null,network as typeof fetch)).rejects.toThrow();
  expect(network).not.toHaveBeenCalled();
 });
 it('fails closed on ID mismatch, absent CFTR identity and malformed structure',()=>{
  expect(()=>decodeClinVarSummary(result('7106'),'7105','2026-10-15T00:00:00Z')).toThrow();
  expect(()=>decodeClinVarSummary(result('7105','OTHER'),'7105','2026-10-15T00:00:00Z')).toThrow();
  expect(()=>decodeClinVarSummary({result:{uids:[]}},'7105','2026-10-15T00:00:00Z')).toThrow();
  expect(()=>decodeClinVarSummary({result:{uids:['7105'],7105:{uid:'7105',accession:'VCV000007106',genes:[{symbol:'CFTR'}],title:'record'}}},'7105','2026-10-15T00:00:00Z')).toThrow();
 });
 it('does not fabricate missing external assessments',()=>{
  const data=result();
  const doc=data.result['7105'] as {germline_classification?:unknown};
  delete doc.germline_classification;
  const summary=decodeClinVarSummary(data,'7105','2026-10-15T00:00:00Z');
  expect(summary.germlineDescription).toBeNull();
  expect(summary.reviewStatus).toBeNull();
  expect(summary.lastEvaluated).toBeNull();
 });
 it('does not substitute stale data after an external error',async()=>{
  const network=vi.fn(async()=>new Response('{}',{status:429}));
  await expect(retrieveClinVarSummary('7105',network as typeof fetch)).rejects.toThrow('unavailable');
 });
});
