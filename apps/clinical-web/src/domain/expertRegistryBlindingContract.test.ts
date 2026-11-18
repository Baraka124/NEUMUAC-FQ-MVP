import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';

/** 14H212 static SQL gate. Real two-account isolation must still pass on staging. */
const sql=readFileSync(new URL('../../../../supabase/proposed/20261118124500_nfq_expert_reference_registry_v1.sql',import.meta.url),'utf8');
describe('14H212 independent reviewer blinding contract',()=>{
 it('does not reveal a peer extraction before both reviewers submit',()=>{
  expect(sql).toMatch(/from nfq_evidence_review\.expert_reference_extractions e\s+where e\.case_id=p_case_id and e\.variant_id=p_variant_id\s+-- Until both reviews[\s\S]*?and \(e\.reviewer_id=v_actor or\s+\(select count\(\*\) from nfq_evidence_review\.expert_reference_extractions c\s+where c\.case_id=p_case_id and c\.variant_id=p_variant_id\)=2\)/);
 });
 it('does not leak another reviewer identity through a partial audit trail',()=>{
  expect(sql).toMatch(/from nfq_evidence_review\.expert_reference_audit a\s+where a\.case_id=p_case_id and a\.variant_id=p_variant_id\s+and \(a\.actor_id=v_actor or\s+\(select count\(\*\) from nfq_evidence_review\.expert_reference_extractions c\s+where c\.case_id=p_case_id and c\.variant_id=p_variant_id\)=2\)/);
 });
 it('requires both expert submissions before source mapping',()=>{
  expect(sql).toContain('Both independent expert submissions are required');
  expect(sql).toContain('Independent mapping attestor required');
 });
 it('keeps original publication and scope checks on mapping',()=>{
  expect(sql).toContain('Source claim does not point to the anchored original publication');
  expect(sql).toContain('Cannot compare incompatible structured endpoints');
  expect(sql).toContain('Unadjudicated scientific context disagreement');
 });
});
