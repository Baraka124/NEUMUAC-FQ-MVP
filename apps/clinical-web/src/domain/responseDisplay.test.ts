import {describe,expect,it} from 'vitest';
import {describeRecordedEti,describeSourceFinding} from './responseDisplay';

describe('14H5 restrained research response presentation',()=>{
 it('preserves all historical categories without attaching medical certainty',()=>{
  expect(describeRecordedEti('responsive').label).toBe('Classified as responsive');
  expect(describeRecordedEti('non_responsive').label).toBe('Classified as non-responsive');
  expect(describeRecordedEti('responsive').tone).toBe('recorded');
  expect(describeRecordedEti('non_responsive').tone).toBe('recorded');
 });
 it('does not convert unknown or absent to non-responsive or eligible',()=>{
  for(const value of ['unknown',null] as const){
   const status=describeRecordedEti(value);
   expect(status.tone).toBe('unresolved');
   expect(status.label).not.toMatch(/non-responsive|eligible/i);
   expect(status.label).toMatch(/unknown|No classification recorded/);
  }
  expect(describeRecordedEti('unknown').label).toBe('Classification unknown');
  expect(describeRecordedEti(null).label).toBe('No classification recorded');
 });
 it('keeps ETI and Alyftrek source rows readable without claiming patient-level results',()=>{
  expect(describeSourceFinding('responsive')).toBe('Responsive');
  expect(describeSourceFinding('non_responsive')).toBe('Non-responsive');
  expect(describeSourceFinding('mixed')).toBe('Mixed');
  expect(describeSourceFinding('inconclusive')).toBe('Inconclusive');
  expect(describeSourceFinding('unknown')).toBe('Unknown');
  expect(describeSourceFinding(null)).toBe('Not recorded');
 });

});
