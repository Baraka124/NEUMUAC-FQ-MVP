import {describe,it,expect} from 'vitest';
import {assessDecisionRegister,normalizeAliasKey,resolveGovernedAlias,type DecisionRegister,type ScientificDecision} from './nomenclatureGovernance';
import {NOMENCLATURE_REGISTER} from './nomenclatureRegister';
const approved:ScientificDecision={
 id:'NFQ-NOM-101',revision:2,kind:'alias-equivalence',status:'approved',input:'EXAMPLE-ALT-A',
 proposedBy:'author',proposedOn:'2026-10-01',rationale:'Synthetic test only',
 target:{gene:'CFTR',stableVariantId:'FAKE-01',referenceSequence:'NM_000492.4',normalizedNotation:'DEMO-001'},
 sourceReferences:[{sourceTitle:'Synthetic test authority',sourceUrl:'https://example.org/mock',sourceVersion:'1',citedOn:'2026-10-01',recordLocator:'fixture-01'}],
 reviews:[
  {reviewerId:'reviewer-science',role:'scientific',recommendation:'approve',reviewedOn:'2026-10-02',reviewedRevision:2,sourceLocator:'test-attestation-a'},
  {reviewerId:'reviewer-engineering',role:'engineering',recommendation:'approve',reviewedOn:'2026-10-02',reviewedRevision:2,sourceLocator:'test-attestation-b'}
 ],decidedOn:'2026-10-03',dispositionNotes:'Synthetic signed-off fixture only',supersedesId:null
};
const registry=(decisions:readonly ScientificDecision[],activation:DecisionRegister['activation']='release-authorized'):DecisionRegister=>({
 schemaVersion:'1.0.0',rulesetVersion:'1.0.0',legacyBlobSha:NOMENCLATURE_REGISTER.legacyBlobSha,activation,decisions
});
describe('versioned nomenclature governance, isolated from production',()=>{
 it('keeps three real issues unapproved and inactive',()=>{
  const result=assessDecisionRegister(NOMENCLATURE_REGISTER);
  expect(result.errors).toEqual([]);
  expect(result.pendingIds).toEqual(['NFQ-NOM-001','NFQ-NOM-002','NFQ-GATE-003']);
  expect(result.deployable).toBe(false);
  expect(resolveGovernedAlias(NOMENCLATURE_REGISTER,'ΔF508','NM_000492.4')).toBeNull();
 });
 it('disallows activation of a proposal regardless of release switch',()=>{
  const unsafe={...NOMENCLATURE_REGISTER,activation:'release-authorized' as const};
  expect(assessDecisionRegister(unsafe).deployable).toBe(false);
  expect(resolveGovernedAlias(unsafe,'δF508','NM_000492.4')).toBeNull();
 });
 it('requires versioned reference accession, source and distinct reviewers',()=>{
  expect(assessDecisionRegister(registry([approved])).deployable).toBe(true);
  const bad={...approved,target:{...approved.target!,referenceSequence:'NM_000492'}};
  expect(assessDecisionRegister(registry([bad])).errors.join(' ')).toMatch(/reference accession/);
  const sameReviewer={...approved,reviews:[approved.reviews[0],{...approved.reviews[1],reviewerId:'reviewer-science'}]};
  expect(assessDecisionRegister(registry([sameReviewer])).errors.join(' ')).toMatch(/distinct/);
  const missingEvidence={...approved,sourceReferences:[]};
  expect(assessDecisionRegister(registry([missingEvidence])).errors.join(' ')).toMatch(/references/);
  const stale={...approved,reviews:approved.reviews.map(r=>({...r,reviewedRevision:1}))};
  expect(assessDecisionRegister(registry([stale])).errors.join(' ')).toMatch(/approval/);
 });
 it('matches only exact authorized identity and versioned reference',()=>{
  const valid=registry([approved]);
  expect(resolveGovernedAlias(valid,' example-alt-a ','NM_000492.4')?.target.stableVariantId).toBe('FAKE-01');
  expect(resolveGovernedAlias(valid,'EXAMPLE-ALT-A','NM_000492.3')).toBeNull();
  expect(resolveGovernedAlias(valid,'EXAMPLE-ALT','NM_000492.4')).toBeNull();
  expect(resolveGovernedAlias(registry([approved],'disabled'),'EXAMPLE-ALT-A','NM_000492.4')).toBeNull();
 });
 it('rejects conflicting alias keys even when input case differs',()=>{
  const collision={...approved,id:'NFQ-NOM-102',input:'example-alt-a',reviews:approved.reviews.map(r=>({...r,reviewerId:r.reviewerId+'2'}))};
  expect(assessDecisionRegister(registry([approved,collision])).errors.join(' ')).toMatch(/duplicate case-folded/);
  expect(normalizeAliasKey('ΔF508')).toBe(normalizeAliasKey('δF508'));
 });
 it('blocks date errors and rejects revision approvals carrying a rejection',()=>{
  const wrongDate={...approved,decidedOn:'2026-02-30'};
  expect(assessDecisionRegister(registry([wrongDate])).deployable).toBe(false);
  const rejected={...approved,reviews:[...approved.reviews,{...approved.reviews[0],reviewerId:'reviewer-3',recommendation:'reject' as const}]};
  expect(assessDecisionRegister(registry([rejected])).errors.join(' ')).toMatch(/unresolved rejection/);
 });
});
