import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

/** Static contract guard only. This does not execute SQL or certify Supabase RLS. */
const sql=readFileSync(new URL('../../../../supabase/proposed/20261118124500_nfq_expert_reference_registry_v1.sql',import.meta.url),'utf8');
describe('14H202 proposed CFTR expert registry database contract',()=>{
 it('keeps all science records private with RLS and revoked direct table access',()=>{
  for(const table of ['extractions','adjudications','mappings','audit']){
   expect(sql).toContain('alter table nfq_evidence_review.expert_reference_'+table+' enable row level security');
   expect(sql).toContain('revoke all on nfq_evidence_review.expert_reference_'+table+' from public,anon,authenticated');
  }
 });
 it('does not grant anonymous RPC execution or allow unconstrained search path',()=>{
  expect(sql).toContain("security definer set search_path=''");
  expect(sql).toMatch(/revoke all on function public\.nfq_expert_reference_registry\(text,text,bigint,jsonb\) from public,anon/);
  expect(sql).toMatch(/grant execute on function public\.nfq_expert_reference_registry\(text,text,bigint,jsonb\) to authenticated/);
 });
 it('retains active session and membership checks',()=>{
  expect(sql).toContain('auth.sessions');
  expect(sql).toContain('nfq_research_memberships');
  expect(sql).toContain('v_actor uuid:=auth.uid()');
  expect(sql).toContain("coalesce(auth.jwt()->>'is_anonymous','false')='true'");
 });
 it('enforces bibliographic identity and refuses unsupported 1716G/A therapeutic conclusions',()=>{
  expect(sql).toContain('r.pmid=v_pmid');
  expect(sql).toContain('r.id=v_claim.reference_id');
  expect(sql).toContain("p_case_id='c1584ga-complex-allele-splicing-2020'");
  expect(sql).toContain('Both independent expert submissions are required');
  expect(sql).toContain('Cannot compare incompatible structured endpoints');
 });
 it('refuses unknown injected actor IDs and stores audit events',()=>{
  expect(sql).toContain('reviewer_id uuid not null references auth.users(id)');
  expect(sql).toContain('adjudicator_id uuid not null references auth.users(id)');
  expect(sql).toContain('attested_by uuid not null references auth.users(id)');
  expect(sql).toContain('expert_reference_audit');
  expect(sql).not.toMatch(/v_actor\s*:=\s*\(?v_payload/);
 });
});
