import {describe,it,expect} from 'vitest';
import type {RealVariant,RealVariantSource} from '../services/liveVariants';
import {MAX_BATCH_LOOKUP,parseBatchVariantText,resolveBatchVariants,batchLookupCsv} from './batchVariantLookup';
const a:RealVariant={id:'18',legacyName:'R117H',proteinName:'p.Arg117His',cdnaName:null,
 aliases:[],recordedClass:'IV',classSubtype:'atypical',etiPrediction:'unknown',alyftrekPrediction:'unknown'};
const b:RealVariant={...a,id:'19',legacyName:'R117C',proteinName:'p.Arg117Cys'};
describe('original batch lookup parity · source-backed, bounded, explicit identity',()=>{
 it('accepts copied rows/columns and preserves original inputs and duplicate distinctions',()=>{
  const p=parseBatchVariantText('R117H\nG551D\tR117C; R117H');
  expect(p.error).toBeNull();
  expect(p.items.map(x=>x.input)).toEqual(['R117H','G551D','R117C','R117H']);
  expect(p.items[3].duplicate).toBe(true);
  expect(parseBatchVariantText('').error).toContain('Paste at least one');
  expect(parseBatchVariantText('R117H\n'.repeat(MAX_BATCH_LOOKUP+1)).error).toContain('100');
  expect(parseBatchVariantText('X'.repeat(12001)).error).toContain('too large');
  expect(parseBatchVariantText('LongLine'.repeat(15)).items[0].valid).toBe(false);
 });
 it('retains one-digit canonical IDs without accepting malformed decimal identifiers',async()=>{
  const parsed=parseBatchVariantText('1\\n0\\n01\\n18\\nx\\n1234567890123456789'.replace(/\\n/g,'\\n'));
  expect(parsed.items.map(item=>item.valid)).toEqual([true,false,false,true,false,false]);
  const first:RealVariant={...a,id:'1',legacyName:'E831X'};
  const requests:string[]=[];
  const repo:RealVariantSource={
   get:async id=>{requests.push('get:'+id);return id==='1'?first:null;},
   resolveExact:async query=>{requests.push('exact:'+query);return null;},
   list:async opts=>{requests.push('list:'+opts.query);return {records:[],hasMore:false};}
  };
  const rows=await resolveBatchVariants(repo,'1\\n0\\n01\\n18'.replace(/\\n/g,'\\n'),new AbortController().signal);
  expect(rows.map(row=>row.kind)).toEqual(['exact','invalid','invalid','not-found']);
  expect(rows[0].match?.id).toBe('1');
  expect(requests).toEqual(['get:1','get:18','list:18']);
 });
 it('uses exact source identities; ambiguous and partial matches are never auto-promoted',async()=>{
  const methods:string[]=[];
  const repo:RealVariantSource={
   get:async id=>{methods.push('get:'+id);return id==='18'?a:null;},
   resolveExact:async name=>{methods.push('exact:'+name);return name==='R117H'?a:null;},
   list:async opts=>{
    methods.push('list:'+opts.query);
    return opts.query==='R117'?{records:[a,b],hasMore:false}:{records:[],hasMore:false};
   }
  };
  const calls:number[]=[];
  const resolved=await resolveBatchVariants(repo,'R117H\nR117\n18\nG551D\nR117H',new AbortController().signal,(x)=>calls.push(x));
  expect(resolved.map(x=>x.kind)).toEqual(['exact','candidates','exact','not-found','invalid']);
  expect(resolved[1].match).toBeNull();
  expect(resolved[1].candidates.map(x=>x.id)).toEqual(['18','19']);
  expect(resolved[2].match?.id).toBe('18');
  expect(methods.filter(x=>x==='exact:R117H')).toHaveLength(1);
  expect(calls.at(-1)).toBe(5);
 });
 it('never issues requests for duplicate, invalid or empty tokens',async()=>{
  let network=0;
  const repo:RealVariantSource={
   get:async()=>{network++;return null;},
   resolveExact:async()=>{network++;return a;},
   list:async()=>{network++;return {records:[],hasMore:false};}
  };
  const items=await resolveBatchVariants(repo,'R117H\nR117H\nx',new AbortController().signal);
  expect(items.map(x=>x.kind)).toEqual(['exact','invalid','invalid']);
  expect(network).toBe(1);
 });
 it('caps concurrency at 3 and cancellation fails closed rather than disclosing partial results',async()=>{
  let active=0,peak=0;
  const repo:RealVariantSource={
   get:async()=>null,
   resolveExact:async name=>{
    active++;peak=Math.max(peak,active);
    await new Promise(resolve=>setTimeout(resolve,1));
    active--;
    return name==='R117H'?a:null;
   },
   list:async()=>({records:[],hasMore:false})
  };
  const inputs=Array.from({length:30},(_,i)=>'p.Arg'+(200+i)+'His').join('\n');
  const rows=await resolveBatchVariants(repo,inputs,new AbortController().signal);
  expect(rows).toHaveLength(30);
  expect(peak).toBeLessThanOrEqual(3);
  const aborted=new AbortController();aborted.abort();
  await expect(resolveBatchVariants(repo,'R117H',aborted.signal)).rejects.toThrow(/cancel/);
 });
 it('exports only confirmed exact identities; candidate IDs are clearly unverified, CSV formula-safe',async()=>{
  const repo:RealVariantSource={
   get:async()=>null,
   resolveExact:async q=>q==='R117H'?a:null,
   list:async()=>({records:[b],hasMore:false})
  };
  const rows=await resolveBatchVariants(repo,'R117H\nR117',new AbortController().signal);
  const csv=batchLookupCsv(rows)!;
  expect(csv).toContain('confirmed_variant_id');
  expect(csv).toContain('Unverified search suggestions');
  expect(csv).toContain('"exact"');
  expect(csv).toContain('"candidates"');
  expect(csv).toContain('"18"');
  expect(batchLookupCsv([])).toBeNull();
 });
});
