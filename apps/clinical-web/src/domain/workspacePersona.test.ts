import {describe,it,expect} from 'vitest';
import {resolveWorkspacePersona,workspaceTitle} from './workspacePersona';
describe('FQ role-aware workspace presentation',()=>{
 it('shows verified administrator only when FQ membership is administrator',()=>{
  expect(resolveWorkspacePersona('signed-in','verified','administrator','none')).toBe('administrator');
  expect(workspaceTitle('administrator')).toBe('Research administration');
  expect(resolveWorkspacePersona('signed-in','unassigned',null,'verified')).toBe('guest');
  expect(workspaceTitle('guest')).toBe('Guest workspace');
 });
 it('distinguishes a professional researcher from an independently designated guest',()=>{
  expect(resolveWorkspacePersona('signed-in','verified','contributor','none')).toBe('researcher');
  expect(workspaceTitle('researcher')).toBe('My research workspace');
  expect(resolveWorkspacePersona('signed-in','verified','contributor','verified')).toBe('guest');
  expect(resolveWorkspacePersona('signed-in','verified','reviewer','none')).toBe('reviewer');
 });
 it('does not silently treat an unassigned or uncertain account as a verified guest',()=>{
  expect(resolveWorkspacePersona('signed-in','unassigned',null,'none')).toBe('pending');
  expect(resolveWorkspacePersona('signed-in','checking',null,'checking')).toBe('account');
  expect(resolveWorkspacePersona('signed-in','verified','contributor','unavailable')).toBe('researcher');
  expect(resolveWorkspacePersona('signed-in','verified','reviewer','checking')).toBe('reviewer');
  expect(resolveWorkspacePersona('signed-out','verified','administrator','verified')).toBe('public');
  expect(workspaceTitle('public')).toBe('Research access');
 });
});
