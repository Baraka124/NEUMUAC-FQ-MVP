import {describe,it,expect} from 'vitest';
import {verifiedProfileName,profileMonogram,visibleWorkspaceRole} from './profilePresentation';
import type {ProfessionalProfile} from '../services/professionalProfile';

const staff:ProfessionalProfile={
 name:'María García',staffType:'biomedical_engineer',
 department:'Pulmonology',researchGroup:'neumACt',researchLine:null,
 sourceVerifiedAt:'2026-11-06T09:00:00Z'
};
describe('14H122 account profile display without fabricated identity or authority',()=>{
 it('displays a person name only when a verified professional snapshot exists',()=>{
  expect(verifiedProfileName(staff,'ready','researcher')).toBe('María García');
  expect(verifiedProfileName(staff,'unavailable','researcher')).toBe('Research account');
  expect(verifiedProfileName(null,'unlinked','administrator')).toBe('Research account');
  expect(verifiedProfileName(null,'unlinked','guest')).toBe('Guest research account');
 });
 it('generates initials safely and never derives staff initials from email addresses',()=>{
  expect(profileMonogram(staff,'ready')).toBe('MG');
  expect(profileMonogram(staff,'checking')).toBe('FQ');
  expect(profileMonogram(null,'unlinked')).toBe('FQ');
 });
 it('keeps Guest distinct from unassigned, and does not infer privileges from labels',()=>{
  expect(visibleWorkspaceRole('guest','Not verifiable')).toBe('External guest');
  expect(visibleWorkspaceRole('pending','Administrator')).toBe('Awaiting assignment');
  expect(visibleWorkspaceRole('account','Administrator')).toBe('Verifying access');
  expect(visibleWorkspaceRole('researcher','Administrator')).toBe('Research contributor');
  expect(visibleWorkspaceRole('reviewer','Research contributor')).toBe('Scientific reviewer');
  expect(visibleWorkspaceRole('administrator','Not verifiable')).toBe('Administrator');
 });
});
