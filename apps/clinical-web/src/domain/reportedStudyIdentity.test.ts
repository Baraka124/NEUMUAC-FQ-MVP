import {describe,it,expect} from 'vitest';
import {
 validReportedStudyIdentity,UNREPORTED_STUDY_IDENTITY,
 reportedRegistryKey,resolveStudyIdentityLinks,populationFlags,populationSummary,
 type ReportedStudyIdentity
} from './reportedStudyIdentity';

const registered:ReportedStudyIdentity={
 registryType:'nct',registryId:'NCT12345678',publicationRole:'primary-report',
 populationModel:'clinical-participants',diseaseGroup:'cystic-fibrosis',
 ageGroup:'mixed',cohortLabel:'CFTR modulator study group',
 populationDescription:'Participants with cystic fibrosis enrolled in the reported study.',
 sourceLocator:'Methods · Study population'
};
describe('14H172 study registration and aggregate cohort provenance',()=>{
 it('accepts truly unknown registration and population without fabricated clinical data',()=>{
  expect(validReportedStudyIdentity(UNREPORTED_STUDY_IDENTITY)).toBe(true);
  expect(reportedRegistryKey(UNREPORTED_STUDY_IDENTITY)).toBeNull();
  expect(populationSummary(null)).toContain('Historical');
 });
 it('validates published trial registration, population and source locator as one reviewed record',()=>{
  expect(validReportedStudyIdentity(registered)).toBe(true);
  expect(reportedRegistryKey(registered)).toBe('registry:nct:nct12345678');
  expect(populationFlags(registered)).toEqual([]);
  expect(validReportedStudyIdentity({...registered,registryType:'isrctn',registryId:'ISRCTN12345678'})).toBe(true);
  expect(validReportedStudyIdentity({...registered,registryType:'other',registryId:'EUCTR:2026-100201'})).toBe(true);
 });
 it('refuses malformed, ambiguous, incomplete or patient-identifier-like individual fields',()=>{
  for(const change of [
   {registryId:'NCT123'},
   {registryType:'not-reported',registryId:'NCT12345678'},
   {registryType:'nct',registryId:null},
   {populationDescription:'Too short'},
   {populationDescription:'Personal data\nother row'},
   {sourceLocator:'Table'},
   {sourceLocator:'not-reported'},
   {ageGroup:'unknown'},
   {cohortLabel:'x'}
  ])expect(validReportedStudyIdentity({...registered,...change} as ReportedStudyIdentity)).toBe(false);
 });
 it('conservatively links two distinct publication reports with one source-reviewed registry across variants and therapies',()=>{
  const rows=[
   {claimId:'a',studyFamilyId:'PMID-11111111',studyIdentity:registered},
   {claimId:'b',studyFamilyId:'PMID-22222222',studyIdentity:{...registered,publicationRole:'extension' as const}},
   {claimId:'c',studyFamilyId:'PMID-22222222',studyIdentity:null}
  ];
  const links=resolveStudyIdentityLinks(rows);
  expect(links.get('a')?.key).toBe(links.get('b')?.key);
  expect(links.get('c')?.key).toBe(links.get('a')?.key);
  expect(links.get('a')?.linkedPublications).toBe(3);
  expect(links.get('a')?.identityConflict).toBe(false);
 });
 it('does not infer identity for distinct publications just from missing accession',()=>{
  const links=resolveStudyIdentityLinks([
   {claimId:'a',studyFamilyId:'PMID-11111111',studyIdentity:null},
   {claimId:'b',studyFamilyId:'PMID-22222222',studyIdentity:null}
  ]);
  expect(links.get('a')?.key).not.toBe(links.get('b')?.key);
  expect(links.get('a')?.registrationKeys).toEqual([]);
 });
 it('conservatively co-groups conflicting trial accessions under one existing family rather than splitting its papers',()=>{
  const links=resolveStudyIdentityLinks([
   {claimId:'a',studyFamilyId:'family-X',studyIdentity:registered},
   {claimId:'b',studyFamilyId:'family-X',studyIdentity:{...registered,registryId:'NCT87654321'}},
   {claimId:'c',studyFamilyId:'another-paper',studyIdentity:{...registered,registryId:'NCT87654321'}}
  ]);
  expect(links.get('a')?.key).toBe(links.get('c')?.key);
  expect(links.get('a')?.identityConflict).toBe(true);
  expect(links.get('a')?.registrationKeys).toHaveLength(2);
  expect(populationFlags({...registered,publicationRole:'secondary-analysis'}).join(' ')).toContain('overlapping');
 });
 it('rejects duplicate claim identities rather than hiding a source from a linked population group',()=>{
  expect(()=>resolveStudyIdentityLinks([
   {claimId:'same',studyFamilyId:'family-1',studyIdentity:null},
   {claimId:'same',studyFamilyId:'family-2',studyIdentity:null}
  ])).toThrow();
 });
});
