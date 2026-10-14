import {describe,it,expect,vi} from 'vitest';
import {createLiveResearchHistorySource,decodeValidationEvent,decodeConflictEvent} from './liveResearchHistory';
const cfg={endpoint:'https://example.supabase.co',publishableKey:'sb_publishable_demo_only',enabled:true,accessMode:'anonymous' as const};
describe('restricted live historical research data',()=>{
 it('returns variant-scoped records, without requesting identifiers or free-text content',async()=>{
  const calls:string[]=[];
  const transport=vi.fn(async(url:string)=>{calls.push(url);return new Response(JSON.stringify(url.includes('validation_history')?
  [{id:1,variant_id:18,action:'VALIDATED',created_at:'2026-10-01T00:00:00Z',confidence_level:null,snapshot_cftr_class:'II'}]:
  [{id:2,variant_id:18,field:'eti_prediction',severity:'HIGH',resolved:true,detected_at:'2026-09-01T00:00:00Z',resolved_at:'2026-09-02T00:00:00Z'}]),{status:200});});
  const result=await createLiveResearchHistorySource(cfg,transport as typeof fetch).get('18');
  expect(result.validations).toHaveLength(1);expect(result.conflicts[0].resolved).toBe(true);
  expect(calls.every(url=>new URL(url).searchParams.get('variant_id')==='eq.18')).toBe(true);
  for(const url of calls){expect(url).not.toContain('clinician_name');expect(url).not.toContain('details');expect(url).not.toContain('resolved_by');expect(url).not.toContain('notes');}
 });
 it('rejects mismatched variant identity',async()=>{
  const transport=vi.fn(async()=>new Response(JSON.stringify([{id:1,variant_id:19,action:'VALIDATED',created_at:null}]),{status:200}));
  await expect(createLiveResearchHistorySource(cfg,transport as typeof fetch).get('18')).rejects.toThrow();
 });
 it('preserves event status rather than assuming all conflicts are unresolved',()=>{
  const event=decodeConflictEvent({id:4,variant_id:18,field:'eti_prediction',severity:'HIGH',resolved:true,detected_at:null,resolved_at:null});
  expect(event.resolved).toBe(true);
  expect(decodeValidationEvent({id:5,variant_id:18,action:'VALIDATED',created_at:null})).toMatchObject({action:'VALIDATED'});
 });
});
