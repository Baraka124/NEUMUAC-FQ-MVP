import {describe,expect,it} from 'vitest';
import {nextResearchTheme,parseResearchTheme,RESEARCH_THEME_STORAGE_KEY} from './researchTheme';
describe('14H137B original theme is a presentation preference only',()=>{
 it('defaults to the approved light workspace for missing, stale or invalid storage',()=>{
  expect(parseResearchTheme(null)).toBe('light');
  expect(parseResearchTheme(undefined)).toBe('light');
  expect(parseResearchTheme('dark')).toBe('light');
  expect(parseResearchTheme('MIDNIGHT')).toBe('light');
  expect(parseResearchTheme('midnight')).toBe('midnight');
 });
 it('round-trips without touching any scientific or authorization state',()=>{
  expect(RESEARCH_THEME_STORAGE_KEY).toBe('nfq-research-theme-v1');
  expect(nextResearchTheme('light')).toBe('midnight');
  expect(nextResearchTheme('midnight')).toBe('light');
 });
});
